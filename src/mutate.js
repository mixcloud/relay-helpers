/* @flow */
import Relay from 'react-relay/classic';
import type {FileMap} from 'react-relay/lib/RelayTypes';
import type {ProgressCallback} from './networkLayer/requestObject';

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

export type MutationPromise = {
    _env: Relay.Environment,
    _mutation: Relay.GraphQLMutation,
    abort: () => void,
    onUploadProgress: (cb: ProgressCallback) => MutationPromise,
    then: (any) => MutationPromise,
    catch: (any) => void
};
export type Mutate = (config: MutationConfig) => MutationPromise;

export default function mutate(env: Relay.Environment, config: MutationConfig): MutationPromise {
    const {query, variables, files = null, optimisticResponse, configs = []} = config;

    var mutation;
    var promise = new Promise((resolve, reject) => {
        mutation = new Relay.GraphQLMutation(query, variables, files, env, {
            onSuccess: resolve,
            onFailure: (transaction) => reject(transaction.getError())
        });
        if (optimisticResponse) {
            mutation.applyOptimistic(query, optimisticResponse, configs);
        }
        mutation.commit(configs);
    });

    promise = (promise: any); // I give up

    promise._mutation = mutation;
    promise._env = env;
    promise.abort = () => {
        const mutationId = (promise: any)._mutation._transaction.id;
        const request = (promise: any)._env._requests.get(mutationId);
        if (request) {
            request.abort();
        }
    };
    promise.onUploadProgress = (cb) => {
        const mutationId = (promise: any)._mutation._transaction.id;
        const request = (promise: any)._env._requests.get(mutationId);
        if (request) {
            request.onUploadProgress(cb);
        }
        return promise; // To allow for method chaining
    };
    return promise;
}
