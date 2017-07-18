/* @flow */
import Relay from 'react-relay/classic';
import type {FileMap} from 'react-relay/lib/RelayTypes';

type RangeBehavior = 'prepend' | 'append' | 'ignore' | 'refetch' | 'remove';

type RelayMutationConfig = (
    {|
        type: 'RANGE_ADD',
        parentName: string,
        parentID: string,
        connectionName: string,
        edgeName: string,
        rangeBehaviors: (
            {[behaviour: string]: RangeBehavior}
          | (args: Object) => RangeBehavior
        )
    |}
  | {|
        type: 'NODE_DELETE',
        deletedIDFieldName: string | string[],
        parentName?: string,
        parentID?: string,
        connectionName?: string
    |}
  | {|
        type: 'RANGE_DELETE',
        parentName: string,
        parentId: string,
        connectionName: string,
        deletedIDFieldName: string | string[],
        pathToConnection: string[]
    |}
  | {|
        type: 'REQUIRED_CHILDREN',
        children: Relay.QL[]
    |}
);


export type MutationConfig = {
    query: Relay.QL,
    variables: {[variableName: string]: any},
    files?: {[fileName: string]: FileMap},
    optimisticResponse?: Object,
    configs?: RelayMutationConfig[]
};

export type Mutate = (config: MutationConfig) => Promise<*>;

type PromiseParams = {env: Relay.Environment, config: MutationConfig} | Function;

class MutationPromise extends Promise {
    abort: () => void = () => {};
    onProgress: () => void = () => {};
    _env: Relay.Environment;
    _mutation: Relay.GraphQLMutation;

    constructor(params: PromiseParams) {
        if (typeof params === 'function') {
            // Promise constructor is called again on catch, in which case we
            // just run the executor directly as a normal promise.
            super(params);
            return;
        }

        const {env, config} = params;
        const {query, variables, files = null, optimisticResponse, configs = []} = config;

        var mutation;
        super((resolve, reject) => {
            mutation = new Relay.GraphQLMutation(query, variables, files, env, {
                onSuccess: resolve,
                onFailure: (transaction) => reject(transaction.getError())
            });
            if (optimisticResponse) {
                mutation.applyOptimistic(query, optimisticResponse, configs);
            }
            mutation.commit(configs);
        });

        this._mutation = mutation;
        this._env = env;
    }

    abort = () => {
        if (this.request) {
            this.request.abort();
        }
    }

    onProgress = (cb) => {
        if (this.request) {
            this.request.onProgress(cb);
        }
        return this; // To allow for method chaining
    }

    onUploadProgress = (cb) => {
        if (this.request) {
            this.request.onUploadProgress(cb);
        }
        return this; // To allow for method chaining
    }

    get request() {
        try {
            const mutationId = this._mutation._transaction.id;
            const request = this._env._requests.get(mutationId);
            return request;
        } catch (_) {
            return null;
        }
    }
}

export default function mutate(env: Relay.Environment, config: MutationConfig): MutationPromise {
    return new MutationPromise({env, config});
}
