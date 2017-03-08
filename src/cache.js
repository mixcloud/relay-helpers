/* @flow */
import toGraphQL from 'react-relay/lib/toGraphQL';
import type {ServerResult} from './environment/base';
import type {QueryRequest} from './networkLayer/server';


type QuerySubscriber = (queryName: string, variables: Object, result: ServerResult) => void;

export function querySubscriberDecorator(onResponse: QuerySubscriber) {
    var pendingQueries = {};

    function handlePendingQueries() {
        Object.keys(pendingQueries).forEach(name => {
            const queryRequests = pendingQueries[name];
            const fieldNames = Object.keys(queryRequests);

            Promise.all(
                fieldNames.map(fieldName => queryRequests[fieldName])
            ).then(results => {
                const serverResult = {};
                var variables = {};

                for (let i = 0; i < fieldNames.length; i++) {
                    const {response: data} = results[i];
                    const fieldName = fieldNames[i];
                    const query = queryRequests[fieldName].getQuery();
                    variables = {
                        ...variables,
                        ...query.getVariables()
                    }
                    serverResult[fieldName] = {
                        query: toGraphQL.Query(query),
                        data
                    };
                }

                onResponse(name, variables, serverResult);
            });
        });
        pendingQueries = {};
    }

    return (queryRequest: QueryRequest) => {
        const query = queryRequest.getQuery();
        const concreteQuery = query.getConcreteQueryNode();
        const {name, fieldName} = concreteQuery;

        pendingQueries[name] = pendingQueries[name] || {};
        pendingQueries[name][fieldName] = queryRequest;

        // Delay handling the queries until a tick later so they can be grouped by query name
        setImmediate(handlePendingQueries);
    };
}
