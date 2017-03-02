/* @flow */
import BaseEnvironment from './base';
import fromGraphQL from 'react-relay/lib/fromGraphQL';
import type {ServerData} from './base';


export default class ClientEnvironment extends BaseEnvironment {
    isomorphicInjectServerData(data: ServerData) {
        this.isIsomorphicRender = true;

        const storeData = this.getStoreData();
        data.forEach((querySetResult) => {
            const querySet = {};
            Object.keys(querySetResult).forEach((queryName) => {
                const {query: concreteQuery, data} = querySetResult[queryName];
                const query = fromGraphQL.Query(concreteQuery);
                // Inject the individual queries and their results into the store
                storeData.handleQueryPayload(query, data);
                querySet[queryName] = query;
            });
            // Run primeCache on the query to get the readyState that the renderer needs
            this.isomorphicRunQuery(querySet);
        });

        return this.isomorphicQueriesPromise;
    }
}
