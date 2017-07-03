/* @flow */
import Relay from 'react-relay/classic';
import QuerySetMap from './querySetMap';
import type {QuerySet} from './querySetMap';


export type ServerResult = {
    [name: string]: {
        query: Object,
        data: Object
    }
};

export type ServerData = ServerResult[];
export type OnReadyStateChange = (readyState: {error: ?Error, aborted: boolean, done: boolean}) => void;


export default class BaseEnvironment extends Relay.Environment {
    isomorphicQueriesMap = new QuerySetMap();
    isIsomorphicRender = false;

    isomorphicRunQueriesOrGetReadyState(Container: Relay.Container, queryConfig: Relay.Route) {
        const querySet: QuerySet = Relay.getQueries(Container, queryConfig);
        const pendingQuery = this.isomorphicQueriesMap.get(querySet);

        // querySet fetch finished, return the readyState
        if (pendingQuery && pendingQuery.readyState) {
            // We should be here in the second server render and the first client render
            return pendingQuery.readyState;
        }

        // We haven't seen this querySet before
        if (!pendingQuery && this.isServer) {
            this.isomorphicRunQuery(querySet);
        }

        return null;
    }

    isomorphicRunQuery = (querySet: QuerySet) => {
        const promise = new Promise((resolve) => {
            // Tell Relay that we need data for this query - on the server it will perform the query, on the
            // client it will find the cached results.
            this.isomorphicFetchQuerySet(querySet, (readyState) => {
                if (readyState.error || readyState.aborted || readyState.done) {
                    const pendingQuery = this.isomorphicQueriesMap.get(querySet);
                    if (pendingQuery) {
                        // Store the readyState associated with the querySet so we can get it on render
                        pendingQuery.readyState = readyState;
                        resolve();
                    }
                }
            });
        });
        this.isomorphicQueriesMap.set(querySet, {promise, result: {}});
    };

    isomorphicFetchQuerySet(querySet: QuerySet, onReadyStateChange: OnReadyStateChange) {
        this.primeCache(querySet, onReadyStateChange);
    }

    get isomorphicQueriesPromise(): Promise<void[]> {
        return Promise.all(this.isomorphicQueriesMap.values().map(({promise}) => promise));
    }
}
