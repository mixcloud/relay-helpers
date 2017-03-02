/* @noflow */
import React from 'react';
import Relay from 'react-relay';
import withRelayRenderer from '../withRelayRenderer';
import {shallow} from 'enzyme';
import {createMockRelayEnv} from '../../../tests/mocks';
import createRelayContainer from "../createRelayContainer";


describe('withRelayRenderer', () => {
    var Container,
        env,
        relayEnv,
        queries = {},
        mockContext,
        queryConfig,
        Wrapper;

    beforeEach(() => {
        relayEnv = createMockRelayEnv();
        env = relayEnv.env;
        mockContext = {relayEnv};
        function TestComponent() {}
        Container = createRelayContainer({fragments: {viewer: () => ({})}})(TestComponent);
        queryConfig = {
            name: 'TestQuery',
            queries: {},
            params: {}
        };
        Wrapper = withRelayRenderer({queryConfig})(Container);
    });

    it('should render a Relay.Renderer', () => {
        const wrapper = shallow(<Wrapper />, {context: mockContext});
        expect(wrapper.node.type).toBe(Relay.Renderer);
        expect(wrapper.props()).toEqual(jasmine.objectContaining({
            Container,
            forceFetch: false,
            queryConfig: {
                name: 'TestQuery',
                queries: {},
                params: {}
            },
            environment: relayEnv.env,
            render: jasmine.any(Function)
        }));
    });

    it('should accept a function for queryConfig and call it with props', () => {
        const queryConfig = jest.fn(({testprop}) => {
            return {
                name: 'testname',
                queries: {test: 1},
                params: {anyParam: testprop}
            };
        });
        const Wrapper = withRelayRenderer({queryConfig})(Container);
        const wrapper = shallow(<Wrapper testprop="another" />, {context: mockContext});
        // expect(queryConfig).toBeCalledWith({testprop: "another"}, Container);
        expect(wrapper.props().queryConfig).toEqual({
            name: 'testname',
            queries: {test: 1},
            params: {anyParam: 'another'}
        });
    });

    describe('ttl', () => {
        it('should call relayEnv.onQuerySuccess on query success', () => {
            relayEnv.onQuerySuccess = jest.fn();

            const Wrapper = withRelayRenderer({
                queryConfig: {
                    name: 'TestQuery',
                    queries: {},
                    params: {
                        id: {required: true}
                    }
                }
            })(Container);

            const wrapper = shallow(<Wrapper id="someid" />, {context: mockContext});

            // Simulate success
            wrapper.node.props.render({props: {}});
            expect(relayEnv.onQuerySuccess).toBeCalledWith(jasmine.objectContaining({name: 'TestQuery', params: {id: "someid"}}));
        });

        it('should call shouldForceFetch on query success and pass on to renderer', () => {
            const Wrapper = withRelayRenderer({queryConfig, ttl: 1000})(Container);
            relayEnv.shouldForceFetch = jest.fn(() => true);
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(wrapper.props().forceFetch).toBe(true);
            expect(relayEnv.shouldForceFetch).toBeCalledWith(jasmine.objectContaining({name: 'TestQuery', params: {}}), 1000);
        });

        it('should take props.forceFetch over shouldForceFetch', () => {
            const Wrapper = withRelayRenderer({queryConfig, ttl: 1000})(Container);
            relayEnv.shouldForceFetch = jest.fn(() => false);
            const wrapper = shallow(<Wrapper forceFetch={true} />, {context: mockContext});
            expect(wrapper.props().forceFetch).toBe(true);
            expect(relayEnv.shouldForceFetch).not.toBeCalled();
        });

        it('should take options.forceFetch over shouldForceFetch', () => {
            const Wrapper = withRelayRenderer({
                queryConfig,
                forceFetch: true,
                ttl: 1000
            })(Container);
            relayEnv.shouldForceFetch = jest.fn(() => false);
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(wrapper.props().forceFetch).toBe(true);
            expect(relayEnv.shouldForceFetch).not.toBeCalled();
        });
    });

    describe('params', () => {
        it('should add proptypes to the wrapper', () => {
            const Wrapper = withRelayRenderer({
                queryConfig: {
                    name: 'TestQuery',
                    queries,
                    params: {
                        id: {required: true}
                    }
                }
            })(Container);
            expect(Wrapper.propTypes.id({id: 'dsf'}, 'id', 'Wrapper')).toBe(null);
            expect(Wrapper.propTypes.id({}, 'id', 'Wrapper')).not.toBe(null);
        });

        it('should take params from props', () => {
            const Wrapper = withRelayRenderer({
                queryConfig: {
                    name: 'TestQuery',
                    queries,
                    params: {
                        id: {required: true},
                        somethingelse: {required: false}
                    }
                }
            })(Container);

            const wrapper = shallow(<Wrapper id="someid" somethingelse={10} />, {context: mockContext});
            expect(wrapper.instance().queryConfig.params).toEqual({id: 'someid', somethingelse: 10});

            wrapper.setProps({id: 'another', somethingelse: 11});
            expect(wrapper.instance().queryConfig.params).toEqual({id: 'another', somethingelse: 11});
        });
    });

    it('should render with different states', () => {
        const wrapper = shallow(<Wrapper another="test" />, {context: mockContext});

        expect(wrapper.props().render({}).type).toBe(Container);

        const retry = () => {};
        // Loading
        expect(wrapper.props().render({retry}).props).toEqual({
            another: "test",
            loading: true,
            error: null,
            offline: false,
            retry,
            viewer: null
        });

        // Render with data
        expect(wrapper.props().render({retry, props: {viewer: 'data'}}).props).toEqual({
            another: "test",
            loading: false,
            error: null,
            offline: false,
            retry,
            viewer: 'data'
        });

        // Render error
        var error = new Error("test error");
        expect(wrapper.props().render({retry, error}).props).toEqual({
            another: "test",
            loading: false,
            error,
            offline: false,
            retry,
            viewer: null
        });

        // Retry after error
        expect(wrapper.props().render({retry}).props).toEqual({
            another: "test",
            loading: true,
            error,
            offline: false,
            retry,
            viewer: null
        });

        // Success after error
        expect(wrapper.props().render({retry, props: {viewer: 'data'}}).props).toEqual({
            another: "test",
            loading: false,
            error: null,
            offline: false,
            retry,
            viewer: 'data'
        });

        // Render offline
        error = new TypeError("Network request failed");
        expect(wrapper.props().render({retry, error}).props).toEqual({
            another: "test",
            loading: false,
            error,
            offline: true,
            retry,
            viewer: null
        });

        // Retry after offline
        expect(wrapper.props().render({retry}).props).toEqual({
            another: "test",
            loading: true,
            error,
            offline: true,
            retry,
            viewer: null
        });

        // Success after offline
        expect(wrapper.props().render({retry, props: {viewer: 'data'}}).props).toEqual({
            another: "test",
            loading: false,
            error: null,
            offline: false,
            retry,
            viewer: 'data'
        });
    });

    describe('reset listeners', () => {
        it('should listen for resets and forceUpdate', () => {
            var callbacks = [];
            relayEnv.addResetListener = callback => { callbacks.push(callback); };
            relayEnv.removeResetListener = callback => { callbacks = callbacks.filter(other => other !== callback); };
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            wrapper.instance().componentDidMount();
            wrapper.instance().forceUpdate = jest.fn();
            expect(callbacks.length).toEqual(1);
            expect(wrapper.instance().forceUpdate).not.toBeCalled();
            callbacks[0]();
            expect(wrapper.instance().forceUpdate).toBeCalled();
            wrapper.unmount();
            expect(callbacks.length).toEqual(0);
        });
    });

    describe('Isomorphic', () => {
        it('should use a <Relay.Renderer /> with an unsupported relay environment', () => {
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(wrapper.node.type).toBe(Relay.Renderer);
            expect(wrapper.node.props.Container).toBe(Container);
            expect(wrapper.node.props.queryConfig).toEqual(queryConfig);
        });

        it('should not run the query on the server if isomorphic option is false', () => {
            const Wrapper = withRelayRenderer({queryConfig, isomorphic: false})(Container);
            env.isIsomorphicRender = true;
            env.isServer = true;
            env.isomorphicRunQueriesOrGetReadyState = jest.fn(() => null);
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(env.isomorphicRunQueriesOrGetReadyState).not.toBeCalled();
            expect(wrapper.node.type).toBe(Relay.Renderer);
        });

        it('should call render null if no query response is available on the server', () => {
            env.isIsomorphicRender = true;
            env.isServer = true;
            env.isomorphicRunQueriesOrGetReadyState = jest.fn(() => null);
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(env.isomorphicRunQueriesOrGetReadyState).toBeCalled();
            expect(wrapper.node).toBe(null);
        });

        it('should use a <Relay.Renderer /> if no query response is available on the client', () => {
            env.isIsomorphicRender = true;
            env.isomorphicRunQueriesOrGetReadyState = jest.fn(() => null);
            relayEnv.initialRender = true;
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(env.isomorphicRunQueriesOrGetReadyState).toBeCalled();
            expect(wrapper.node.type).toBe(Relay.Renderer);
            expect(wrapper.node.props.Container).toBe(Container);
            expect(wrapper.node.props.queryConfig).toEqual(queryConfig);
        });

        it('should use a <Relay.Renderer /> for renders after the initial render on the client', () => {
            env.isIsomorphicRender = true;
            env.isomorphicRunQueriesOrGetReadyState = jest.fn(() => null);
            relayEnv.initialRender = false;
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(env.isomorphicRunQueriesOrGetReadyState).not.toBeCalled();
            expect(wrapper.node.type).toBe(Relay.Renderer);
            expect(wrapper.node.props.Container).toBe(Container);
            expect(wrapper.node.props.queryConfig).toEqual(queryConfig);
        });

        it('should use a <Relay.ReadyStateRenderer /> when a fetched query is available on the server', () => {
            const readyState = {};
            env.isIsomorphicRender = true;
            env.isServer = true;
            env.isomorphicRunQueriesOrGetReadyState = jest.fn((Container_, queryConfig_) => {
                expect(Container_).toBe(Container);
                expect(queryConfig_).toEqual(queryConfig);
                return readyState;
            });
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(env.isomorphicRunQueriesOrGetReadyState).toBeCalled();
            expect(wrapper.node.type).toBe(Relay.ReadyStateRenderer);
            expect(wrapper.node.props.Container).toBe(Container);
            expect(wrapper.node.props.queryConfig).toEqual(queryConfig);
            expect(wrapper.node.props.readyState).toBe(readyState);
        });

        it('should use a <Relay.ReadyStateRenderer /> when a fetched query is available on the client', () => {
            const readyState = {};
            env.isIsomorphicRender = true;
            relayEnv.initialRender = true;
            env.isomorphicRunQueriesOrGetReadyState = jest.fn((Container_, queryConfig_) => {
                expect(Container_).toBe(Container);
                expect(queryConfig_).toEqual(queryConfig);
                return readyState;
            });
            const wrapper = shallow(<Wrapper />, {context: mockContext});
            expect(env.isomorphicRunQueriesOrGetReadyState).toBeCalled();
            expect(wrapper.node.type).toBe(Relay.ReadyStateRenderer);
            expect(wrapper.node.props.Container).toBe(Container);
            expect(wrapper.node.props.queryConfig).toEqual(queryConfig);
            expect(wrapper.node.props.readyState).toBe(readyState);
        });
    });
});
