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

// TODO: Does this need a polyfill for node?
class MutationPromise extends Promise {
    abort: () => void = () => {};
    onProgress: () => void = () => {};
    env: Relay.Environment;
    mutation: Relay.GraphQLMutation;

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

        this.mutation = mutation;
        this.env = env;
        this.abort = () => {
            if (this.xhr) { // TODO: Don't call xhr and remove when resolved
                this.xhr.abort();
            }
        };
        this.onProgress = () => {};
    }

    get xhr() {
        try {
            const mutationId = this.mutation._transaction.id;
            const xhr = this.env._xhrRequests.get(mutationId);
            return xhr;
        } catch (e) {
            console.error('No xhr or mutation');
        }
    }
}

export default function mutate(env: Relay.Environment, config: MutationConfig): MutationPromise {
    return new MutationPromise({env, config});
}
