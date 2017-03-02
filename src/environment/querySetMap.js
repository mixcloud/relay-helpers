/* @flow */


type RelayQuery = {
    equals: (other: RelayQuery) => boolean,
    getID: () => string
    // ...
};
export type QuerySet = {[name: string]: RelayQuery};


type PendingQueryResult = {
    promise: Promise<void>,
    readyState?: ?Object
};


export default class QuerySetMap {
    /*
    Map where the keys are querySet objects
    */
    _keys: Array<QuerySet> = [];
    _values: Array<PendingQueryResult> = [];

    set(k: QuerySet, v: PendingQueryResult) {
        const index = this.indexOf(k);
        if (index > -1) {
            this._values[index] = v;
        } else {
            this._keys.push(k);
            this._values.push(v);
        }
    }

    get(k: QuerySet): ?PendingQueryResult {
        const index = this.indexOf(k);
        if (index > -1) {
            return this._values[index];
        }
    }

    indexOf(k: QuerySet): number {
        for (let index = 0; index < this._keys.length; index++) {
            if (this.keyEquals(k, this._keys[index])) {
                return index;
            }
        }
        return -1;
    }

    keyEquals(a: QuerySet, b: QuerySet): boolean {
        /*
        Checks that the two querysets (objects {[queryName]: query}) match by checking their queryNames and using the
        "equals" method of each query
        */
        const aNames = Object.keys(a),
            bNames = Object.keys(b);

        if (aNames.length !== bNames.length) {
            return false;
        }

        for (const name of aNames) {
            if (!b[name] || !b[name].equals(a[name])) {
                return false;
            }
        }

        return true;
    }

    keys(): Array<QuerySet> {
        return [...this._keys];
    }

    values(): Array<PendingQueryResult> {
        return [...this._values];
    }

    get size(): number {
        return this._keys.length;
    }
}
