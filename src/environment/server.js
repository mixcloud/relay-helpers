/* @flow */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import toGraphQL from 'react-relay/lib/toGraphQL';
import BaseEnvironment from './base';
import ServerNetworkLayer from '../networkLayer/server';
import type {ServerData, OnReadyStateChange} from './base';
import type {FetchQueryFunction} from '../networkLayer/server';
import type {QuerySet} from './querySetMap';


const MAX_RECURSIONS = 10;


export default class ServerEnvironment extends BaseEnvironment {
    constructor(fetchQuery: FetchQueryFunction) {
        super();
        this.isomorphicNetworkLayer = new ServerNetworkLayer(fetchQuery);
        this.injectNetworkLayer(this.isomorphicNetworkLayer);
    }

    isIsomorphicRender = true;
    isServer = true;

    get isomorphicClientData(): ServerData {
        return this.isomorphicQueriesMap.keys().map((querySet) => {
            // Connect queries with their results
            const clientData = {};
            Object.keys(querySet).forEach((queryName) => {
                const query = querySet[queryName];
                if (this.isomorphicNetworkLayer.queryResults[query.getID()]) {
                    clientData[queryName] = {
                        query: toGraphQL.Query(query),
                        data: this.isomorphicNetworkLayer.queryResults[query.getID()]
                    };
                }
            });
            return clientData;
        }).filter((querySetResult) => Object.keys(querySetResult).length > 0);  // Don't include empty/failed results
    }

    isomorphicFetchQuerySet(querySet: QuerySet, onReadyStateChange: OnReadyStateChange) {
        // As new queries are found recursively some results will be in the cache. This means that the query is not
        // sent through the network layer so we can't associate a result with the query. We use forceFetch here so that
        // all queries go through the network layer
        this.forceFetch(querySet, onReadyStateChange);
    }

    isomorphicGetData(element: React.Element<*>, maxRecursions: number = MAX_RECURSIONS): Promise<string> {
        return isomorphicGetData(this, element, maxRecursions, null);
    }
}


function isomorphicGetData(env: ServerEnvironment, element: React.Element<*>, maxRecursions: number, prevQueryCount: ?number): Promise<string> {
    // Keep rendering until maxRecursions or the query count doesn't change
    const markup = ReactDOMServer.renderToString(element);
    if (maxRecursions === 0 || prevQueryCount === env.isomorphicQueriesMap.size) {
        return Promise.resolve(markup);
    }
    prevQueryCount = env.isomorphicQueriesMap.size;
    return env.isomorphicQueriesPromise.then(() => isomorphicGetData(env, element, maxRecursions - 1, prevQueryCount));
}
