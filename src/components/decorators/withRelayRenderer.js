/* @flow */
import React from 'react';
import Relay from 'react-relay';
import {wraps} from '../../utils';
import {RelayEnvContextType} from "../RelayEnvProvider/index";
import type {RelayEnvContext} from "../RelayEnvProvider/index";
import type {WrappedComponent} from '../../utils';


export type QueryConfig = {|
    name: string,
    queries: {[queryName: string]: () => Relay.QL},
    params: {[paramName: string]: any}
|};


type Options<P> = {|
    queryConfig: (
        {name: string, queries: {}, params?: {[paramName: string]: {required: boolean}}}
      | (props: P, Container: WrappedComponent<P>) => QueryConfig
    ),
    ttl?: ?number,
    forceFetch?: boolean,
    isomorphic?: boolean
|};

type WrapperProps = {|
    forceFetch: boolean
|};


export default <P: Object>({
    queryConfig: optionsQueryConfig,
    forceFetch = false,
    ttl,
    isomorphic = true
}: Options<P>) => (Container: WrappedComponent<P>): ReactClass<P & WrapperProps> => {
    const componentName = Container.displayName || Container.name || ((Container.constructor: any).name: any);

    class Wrapper extends React.PureComponent {
        static contextTypes = {relayEnv: RelayEnvContextType};
        context: {relayEnv: RelayEnvContext};

        props: P & WrapperProps;
        static defaultProps = {
            forceFetch: false
        };

        componentDidMount() {
            this.context.relayEnv.addResetListener(this.onRelayEnvReset);
        }

        componentWillUnmount() {
            this.context.relayEnv.removeResetListener(this.onRelayEnvReset);
        }

        componentWillUpdate(nextProps: P) {
            this.queryConfig = this.getQueryConfig(nextProps);
        }

        queryConfig: QueryConfig = this.getQueryConfig(this.props);

        getQueryConfig(props: P): QueryConfig {
            if (typeof optionsQueryConfig === 'function') {
                /* eslint-disable no-unused-vars */
                const {forceFetch, ...ownProps} = props;
                /* eslint-enable no-unused-vars */
                return optionsQueryConfig(ownProps, Container);
            }

            const {name, queries, params: paramDefinitions = {}} = optionsQueryConfig;

            // Get param values from props
            const params = Object.keys(paramDefinitions).reduce((params, paramName) => {
                if (paramName in props) {
                    params[paramName] = props[paramName];
                }
                return params;
            }, {});

            return {name, queries, params};
        }

        onRelayEnvReset = () => this.forceUpdate();

        // Used to keep track of whether a previous request failed due to being offline or an error
        // Useful if you want to show a retry button with a spinner to
        // detect the difference between initial load and the retry
        error: ?Error = null;
        offline: boolean = false;

        renderContainer = ({error, props, retry}: {error: ?Error, props: ?Object, retry: () => void}) => {
            /* eslint-disable no-unused-vars */
            const {forceFetch, ...ownProps} = this.props;
            /* eslint-enable no-unused-vars */
            var allProps = {
                ...ownProps,
                error: error || this.error,
                retry,
                loading: false,
                offline: this.offline
            };

            if (props) {
                this.context.relayEnv.onQuerySuccess(this.queryConfig);
                allProps = {
                    ...allProps,
                    error: null,
                    offline: false,
                    ...props
                };
                this.error = null;
                this.offline = false;
                return <Container {...allProps} />;
            }

            // Have to provide these props to the Container - even if they are null
            Container.getFragmentNames().forEach(fragmentName => {
                allProps[fragmentName] = null;
            });

            if (error) {
                this.error = error;
                if (error.toString() === 'TypeError: Network request failed') {
                    this.offline = true;
                    allProps.offline = true;
                }
            } else {
                allProps.loading = true;
            }
            return <Container {...allProps} />;
        };

        render(): ?React.Element<Relay.Renderer | Relay.ReadyStateRenderer> {
            const {env, initialRender} = this.context.relayEnv;

            if (isomorphic && env.isIsomorphicRender && (env.isServer || initialRender)) {
                // Isomorphic render
                const readyState = env.isomorphicRunQueriesOrGetReadyState(Container, this.queryConfig);
                if (readyState) {
                    // We have a server response
                    return (
                        <Relay.ReadyStateRenderer
                            Container={Container}
                            queryConfig={this.queryConfig}
                            environment={env}
                            render={this.renderContainer}
                            readyState={readyState}
                        />
                    );
                }

                if (env.isServer) {
                    // We don't have a server response yet - no point rendering anything
                    return null;
                }
            }

            var shouldForceFetch = false;
            if (!env.isServer) {
                shouldForceFetch = forceFetch || this.props.forceFetch;
                if (!shouldForceFetch && ttl) {
                    shouldForceFetch = this.context.relayEnv.shouldForceFetch(this.queryConfig, ttl);
                }
            }

            // We're in normal render mode
            return (
                <Relay.Renderer
                    forceFetch={shouldForceFetch}
                    Container={Container}
                    queryConfig={this.queryConfig}
                    environment={env}
                    render={this.renderContainer}
                />
            );
        }
    }


    const queryConfigParams = typeof optionsQueryConfig !== 'function' && optionsQueryConfig.params;
    // If we know the queryConfig at this point, we can add proptypes to enforce isRequired
    if (queryConfigParams) {
        // Grab propTypes from the paramDefinitions - just PropTypes.any for now, but handles isRequired
        Wrapper.propTypes = Object.keys(queryConfigParams).reduce((propTypes, paramName) => {
            propTypes[paramName] = queryConfigParams[paramName].required ? React.PropTypes.any.isRequired : React.PropTypes.any;
            return propTypes;
        }, {});
    }

    return wraps(Container, Wrapper, componentName ? `WithRelayRenderer(${componentName})` : 'WithRelayRenderer');
};
