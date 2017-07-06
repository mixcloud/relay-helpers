/* @flow */
import React, {Children} from 'react';
import PropTypes from 'prop-types';
import Relay from 'react-relay/classic';
import QueryFetchCache from "./queryFetchCache";
import mutate from '../../mutate';
import type {MutationConfig} from '../../mutate';
import type {ShouldForceFetch, OnQuerySuccess} from './queryFetchCache';


export const RelayEnvContextType = PropTypes.shape({
    env: PropTypes.instanceOf(Relay.Environment).isRequired,
    reset: PropTypes.func.isRequired,
    initialRender: PropTypes.bool.isRequired,
    addResetListener: PropTypes.func.isRequired,
    removeResetListener: PropTypes.func.isRequired,
    shouldForceFetch: PropTypes.func.isRequired,
    onQuerySuccess: PropTypes.func.isRequired,
    mutate: PropTypes.func.isRequired
}).isRequired;

export type RelayEnvContext = {
    env: Relay.Environment,
    reset: () => void,
    initialRender: boolean,
    addResetListener: (callback: () => void) => void,
    removeResetListener: (callback: () => void) => void,
    shouldForceFetch: ShouldForceFetch,
    onQuerySuccess: OnQuerySuccess,
    mutate: (config: MutationConfig) => Promise<*>
};


export default class RelayEnvProvider extends React.PureComponent {
    props: {
        createEnv?: ?() => Relay.Environment,
        initialEnv?: ?Relay.Environment,
        children?: ?any
    };
    static propTypes = {
        createEnv: PropTypes.func,
        initialEnv: PropTypes.instanceOf(Relay.Environment),
        children: PropTypes.element.isRequired
    };
    static childContextTypes = {relayEnv: RelayEnvContextType};

    getChildContext(): {relayEnv: RelayEnvContext} {
        return {relayEnv: this.relayEnvContext};
    }

    _resetListeners: Array<() => void> = [];
    _queryFetchCache = new QueryFetchCache();

    relayEnvContext = {
        // The Relay.Environment
        env: this.props.initialEnv || (this.props.createEnv && this.props.createEnv()),

        // Reset the Relay store and re-render all renderers
        reset: () => {
            if (this.props.createEnv) {
                this.relayEnvContext.env = this.props.createEnv();
                // Notify RelayRenderer components that they should force update
                this._resetListeners.forEach(callback => {
                    callback();
                });
            } else if (process.env.NODE_ENV !== "production") {
                throw Error("createEnv not provided to RelayEnvProvider or relayEnvContext.reset called unexpectedly");
            }
        },

        // Are we in the initial render? Used in isomorphic rendering
        initialRender: true,

        // Renderers register to be notified of resets here
        addResetListener: (callback: () => void) => {
            this._resetListeners.push(callback);
        },
        removeResetListener: (callback: () => void) => {
            this._resetListeners = this._resetListeners.filter(other => other !== callback);
        },

        // Used to manage TTL
        shouldForceFetch: this._queryFetchCache.shouldForceFetch,
        onQuerySuccess: this._queryFetchCache.onQuerySuccess,

        // Mutation helper
        mutate: (config: MutationConfig) => mutate(this.relayEnvContext.env, config)
    };

    componentDidMount() {
        this.relayEnvContext.initialRender = false;
    }

    render(): React.Element<*> {
        return Children.only(this.props.children);
    }
}
