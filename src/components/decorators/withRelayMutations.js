/* @flow */
import React from 'react';
import {wraps} from '../../utils';
import {RelayEnvContextType} from '../RelayEnvProvider';
import type {Mutate} from '../../mutate';
import type {WrappedComponent} from '../../utils';
import type {RelayEnvContext} from "../RelayEnvProvider";


type Mutations = {
    [name: string]: (mutate: Mutate) => (...args: any) => Promise<*>
};


export default (mutations: Mutations) => (Component: WrappedComponent<*>): ReactClass<*> => {
    function Wrapper(props, context: {relayEnv: RelayEnvContext}) {
        const mutationProps: {[mutationName: string]: () => Promise<*>} = Object.keys(mutations).reduce((sum, key) => {
            sum[key] = mutations[key](context.relayEnv.mutate);
            return sum;
        }, {});
        return <Component {...props} {...mutationProps} />;
    }
    Wrapper.contextTypes = {relayEnv: RelayEnvContextType};
    return wraps(Component, Wrapper, `WithRelayMutations(${Component.displayName || Component.name || Component.constructor.name})`);
};
