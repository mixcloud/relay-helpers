/* @flow */
import type {QueryConfig} from '../decorators/withRelayRenderer';

const MAX_TTL = 1000 * 60 * 60 * 24;  // 24 hours

export type OnQuerySuccess = (queryConfig: QueryConfig) => void;
export type ShouldForceFetch = (queryConfig: QueryConfig, ttl: number) => boolean;


export default class QueryFetchCache {
    getKey({name, params}: QueryConfig) {
        return `${name}|${JSON.stringify(params)}`;
    }

    cache: {[key: string]: number} = {};

    onQuerySuccess: OnQuerySuccess = (queryConfig) => {
        this.garbageCollect();
        this.cache[this.getKey(queryConfig)] = Date.now();
    };

    shouldForceFetch: ShouldForceFetch = (queryConfig, ttl) => {
        if (process.env.NODE_ENV !== "production" && ttl > MAX_TTL) {
            throw Error(`ttl ${ttl} is longer than 24 hours - use a shorter TTL`);
        }

        const key = this.getKey(queryConfig);
        if (key in this.cache) {
            return (Date.now() - this.cache[key]) > ttl;
        }
        return true;
    };

    garbageCollect() {
        const now = Date.now();
        Object.keys(this.cache).forEach(key => {
            if (now - this.cache[key] > MAX_TTL) {
                delete this.cache[key];
            }
        });
    }
}
