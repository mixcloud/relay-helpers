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



export default function mutate(env: Relay.Environment, config: MutationConfig): Promise<*> {
    const {query, variables, files = null, optimisticResponse, configs = []} = config;
    return new Promise((resolve, reject) => {
        const mutation = new Relay.GraphQLMutation(query, variables, files, env, {
            onSuccess: resolve,
            onFailure: (transaction) => reject(transaction.getError())
        });
        if (optimisticResponse) {
            mutation.applyOptimistic(query, optimisticResponse, configs);
        }
        mutation.commit(configs);
    });
}
