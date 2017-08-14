/* @flow */
import Relay from 'react-relay/classic';
export type FetchQueryFunction = (query: {query: string, variables: Object}) => Promise<{errors?: Array<Object>, data?: Object}>;


export type QueryRequest = {
    getQueryString: () => string,
    getVariables: () => Object,
    getID: () => string,
    getQuery: () => Relay.QL,
    resolve: (data: any) => void,
    reject: (error: any) => void,
    then: (onResolve: (result: {response: any}) => void, onReject: ?() => void) => Promise<*>
};


// A simple network layer that calls the passed in function to run a query and collects results
export default class ServerNetworkLayer {
    queryResults = {};
    _fetchQuery: FetchQueryFunction;

    constructor(fetchQuery: FetchQueryFunction) {
        this._fetchQuery = fetchQuery;
    }

    supports() {}

    sendQueries(queryRequests: QueryRequest[]) {
        return Promise.all(queryRequests.map(this._sendQuery));
    }

    _sendQuery = (queryRequest: QueryRequest) => {
        return new Promise((resolve, reject) => {
            this._fetchQuery({
                query: queryRequest.getQueryString(),
                variables: queryRequest.getVariables()
            }).then((response) => {
                const {data} = response;
                if ('errors' in response || !data) {
                    const queryName = queryRequest.getQuery().getName();
                    var errorMsg = `Server Error (${queryName})`;
                    try {
                        errorMsg += ` ${JSON.stringify(response.errors)}`;
                    } catch (err) {} // eslint-disable-line no-empty
                    const error = new Error(errorMsg);
                    queryRequest.reject(error);
                    reject(error);
                } else {
                    queryRequest.resolve({response: data});
                    resolve(data);
                    this.queryResults[queryRequest.getID()] = data;
                }
            });
        });
    }
}
