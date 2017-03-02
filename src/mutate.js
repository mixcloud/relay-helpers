/* @flow */
import Relay from 'react-relay';
import type {FileMap} from 'react-relay/lib/RelayTypes';


type RelayMutationConfig = (
    {|
        type: 'RANGE_ADD',
        parentName: string,
        parentID: string,
        connectionName: string,
        edgeName: string,
        rangeBehaviors: {[behaviour: string]: 'prepend' | 'append' | 'ignore' | 'refetch' | 'remove'}
    |}
  | {|
        type: 'NODE_DELETE',
        parentName: string,
        parentID: string,
        connectionName: string,
        deletedIDFieldName: string | string[]
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
    const {query, variables, files, optimisticResponse, configs = []} = config;
    return new Promise((resolve, reject) => {
        const mutation = new Relay.GraphQLMutation(query, variables, files, env, {
            onSuccess: resolve,
            onFailure: reject
        });
        if (optimisticResponse) {
            mutation.applyOptimistic(query, optimisticResponse);
        }
        mutation.commit(configs);
    });
}
