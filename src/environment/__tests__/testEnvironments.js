/* @noflow */
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Relay from 'react-relay';
import ClientEnvironment from '../client';
import ServerEnvironment from '../server';
import {shallow} from 'enzyme';
import toGraphQL from 'react-relay/lib/toGraphQL';
import fromGraphQL from 'react-relay/lib/fromGraphQL';
import withRelayQuery from '../../components/decorators/withRelayQuery';
import {createMockRelayEnv} from "../../tests/mocks";
import RelayEnvProvider from '../../components/RelayEnvProvider';


function TestComponent() {}

const Wrapper = withRelayQuery({
    query: [
        Relay.QL`
            query {
                user(id: $userId) {
                    username
                }
            }
        `,
        Relay.QL`
            query {
                node(id: $nodeId) {
                    id
                }
            }
        `
    ],
    params: {
        userId: {required: true},
        nodeId: {required: true}
    }
})(TestComponent);


const data = {
    node: {data: {node: {id: 'node1', __typename: 'User'}}},
    user: {data: {user: {username: 'myusername'}}}
};

describe('Environments', () => {
    var relayEnv;

    beforeEach(() => {
        jest.useFakeTimers();
        relayEnv = createMockRelayEnv();
    });

    it('should work end to end', () => {
        var serverData = null;

        return new Promise(resolve => {
            // Server side
            const graphqlCalls = [];
            const serverEnv = new ServerEnvironment((...args) => {
                return new Promise((resolve) => {
                    graphqlCalls.push({args, resolve});
                });
            });

            shallow(<Wrapper userId="user1" nodeId="node1" />, {
                context: {
                    relayEnv: {
                        ...relayEnv,
                        env: serverEnv
                    }
                }
            });

            jest.runAllTimers();
            graphqlCalls.forEach(({args: [{query}], resolve}) => {
                if (query.match(/node/)) {
                    resolve(data.node);
                } else {
                    resolve(data.user);
                }
            });

            serverEnv.isomorphicQueriesPromise.then(() => {
                serverData = serverEnv.isomorphicClientData;
                resolve();
            });
        }).then(() => {
            const sendQueries = jest.fn();
            return new Promise((resolve) => {
                // Client side
                const clientEnv = new ClientEnvironment();
                clientEnv.injectNetworkLayer({sendQueries, supports() {}});

                clientEnv.isomorphicInjectServerData(serverData).then(() => {
                    const wrapper = shallow(<Wrapper userId="user1" nodeId="node1" />, {
                        context: {
                            relayEnv: {
                                ...relayEnv,
                                env: clientEnv,
                                initialRender: true
                            }
                        }
                    });
                    expect(wrapper.node.type).toBe(Relay.ReadyStateRenderer);
                    resolve();
                });
                jest.runAllTimers();
            }).then(() => {
                expect(sendQueries).not.toBeCalled();
            });
        });
    });

    describe('Server', () => {
        var graphql,
            graphqlCalls;

        beforeEach(() => {
            graphqlCalls = [];
            graphql = jest.fn((...args) => {
                return new Promise((resolve) => {
                    graphqlCalls.push({args, resolve});
                });
            });
            relayEnv.env = new ServerEnvironment(graphql);
        });

        function respond() {
            graphqlCalls.forEach(({args: [{query}], resolve}) => {
                if (query.match(/node/)) {
                    resolve(data.node);
                } else {
                    resolve(data.user);
                }
            });
        }

        it('should find and collect queries recursively', () => {
            const env = new ServerEnvironment(({query}) => {
                if (query.match(/node/)) {
                    return Promise.resolve(data.node);
                } else {
                    return Promise.resolve(data.user);
                }
            });

            function TestInnerComponent({user, nodeId}) {
                if (user) {
                    return <div>{user.username} {nodeId}</div>;
                }
                return null;
            }
            TestInnerComponent = withRelayQuery({
                query: Relay.QL`query { user(id: $userId) { username } }`,
                params: {userId: {required: true}}
            })(TestInnerComponent);

            function TestOuterComponent({node}) {
                if (node) {
                    return <TestInnerComponent nodeId={node.id} userId="user1" />;
                }
                return null;
            }
            TestOuterComponent = withRelayQuery({
                query: Relay.QL`query { node(id: $nodeId) { id } }`,
                params: {nodeId: {required: true}}
            })(TestOuterComponent);

            return new Promise(resolve => {
                const app = (
                    <RelayEnvProvider initialEnv={env}>
                        <TestOuterComponent nodeId="node1" />
                    </RelayEnvProvider>
                );

                env.isomorphicGetData(app).then((markup) => {
                    expect(markup).toEqual(ReactDOMServer.renderToString(app));
                    expect(ReactDOMServer.renderToStaticMarkup(app)).toEqual('<div>myusername node1</div>');
                    resolve();
                });
            });
        });

        it('should find and collect queries on initial render and run them', () => {
            shallow(
                <Wrapper userId="userId" nodeId="nodeId" />,
                {context: {relayEnv}}
            );

            // Rendering the component called isomorphicRunQueriesOrGetReadyState which updated the queries map...
            expect(relayEnv.env.isomorphicQueriesMap.keys().length).toEqual(1);

            jest.runAllTimers();

            // ... which calls our graphql function once for each query ...
            expect(graphql.mock.calls.length).toEqual(2);
        });

        it('should render nothing on initial render', () => {
            const wrapper = shallow(
                <Wrapper userId="userId" nodeId="nodeId" />,
                {context: {relayEnv}}
            );
            expect(wrapper.node).toBe(null);
        });

        it('should render a Relay.ReadyStateRenderer on second render with the provided readyState', () => {
            return new Promise(resolve => {
                shallow(
                    <Wrapper userId="userId" nodeId="nodeId" />,
                    {context: {relayEnv}}
                );
                jest.runAllTimers();
                respond();

                relayEnv.env.isomorphicQueriesPromise.then(() => {
                    const wrapper = shallow(
                        <Wrapper userId="userId" nodeId="nodeId" />,
                        {context: {relayEnv}}
                    );
                    // Inner stuff rendered now
                    expect(wrapper.node.type).toBe(Relay.ReadyStateRenderer);
                    expect(wrapper.node.props.readyState).toBe(relayEnv.env.isomorphicQueriesMap.values()[0].readyState);

                    resolve();
                });
            });
        });

        it('should prepare client data and return it make it accessible on isomorphicClientData', () => {
            return new Promise(resolve => {
                shallow(
                    <Wrapper userId="userId" nodeId="nodeId" />,
                    {context: {relayEnv}}
                );
                jest.runAllTimers();
                respond();

                relayEnv.env.isomorphicQueriesPromise.then(() => {
                    expect(relayEnv.env.isomorphicClientData.length).toEqual(1);
                    const [{user, node}] = relayEnv.env.isomorphicClientData;
                    const expectedQueries = relayEnv.env.isomorphicQueriesMap.keys()[0];

                    expect(fromGraphQL.Query(user.query).equals(expectedQueries.user)).toBe(true);
                    expect(fromGraphQL.Query(node.query).equals(expectedQueries.node)).toBe(true);

                    expect(user.data).toBe(data.user.data);
                    expect(node.data).toBe(data.node.data);

                    resolve();
                });
            });
        });

        it('should run queries with the Relay.Environment.primeCache method', () => {
            relayEnv.env.primeCache = jest.fn(relayEnv.env.primeCache.bind(relayEnv.env));
            const wrapper = shallow(
                <Wrapper userId="userId" nodeId="nodeId" />,
                {context: {relayEnv}}
            );
            // Nothing rendered
            expect(wrapper.node).toBe(null);

            // ... and called primeCache to fetch the data ...
            expect(relayEnv.env.primeCache.mock.calls.length).toEqual(1);
            const [
                [querySet]
            ] = relayEnv.env.primeCache.mock.calls;
            expect(Object.keys(querySet)).toEqual(['user', 'node']);
        });

        it('should provide query readyState on the isomorphicRunQueriesOrGetReadyState method', () => {
            return new Promise(resolve => {
                const wrapper = shallow(
                    <Wrapper userId="userId" nodeId="nodeId" />,
                    {context: {relayEnv}}
                );
                jest.runAllTimers();
                respond();

                relayEnv.env.isomorphicQueriesPromise.then(() => {
                    expect(relayEnv.env.isomorphicQueriesMap.values().length).toEqual(1);
                    expect(relayEnv.env.isomorphicQueriesMap.values().every(({readyState}) => !!readyState)).toBe(true);

                    expect(relayEnv.env.isomorphicRunQueriesOrGetReadyState(Wrapper.WrappedComponent, wrapper.instance().queryConfig)).toEqual(jasmine.objectContaining({
                        done: true,
                        error: null,
                        aborted: false,
                        ready: true,
                        stale: false
                    }));
                    resolve();
                });
            });
        });

        it('should handle a graphql query failure', () => {
            return new Promise(resolve => {
                shallow(
                    <Wrapper userId="userId" nodeId="nodeId" />,
                    {context: {relayEnv}}
                );
                jest.runAllTimers();
                graphqlCalls.forEach(({args: [{query}], resolve}) => {
                    if (query.match(/node/)) {
                        resolve(data.node);
                    } else {
                        resolve({errors: ['ERROR']});
                    }
                });

                relayEnv.env.isomorphicQueriesPromise.then(() => {
                    expect(relayEnv.env.isomorphicClientData.length).toEqual(1);
                    expect(relayEnv.env.isomorphicClientData.user).toBe(undefined);
                    resolve();
                });
            });
        });
    });

    describe('Client', () => {
        const Container = Wrapper.WrappedComponent;
        const queryConfig = {
            name: 'TestComponent',
            queries: {
                user: () => Relay.QL`query { user(id: $userId) }`,
                node: () => Relay.QL`query { node(id: $nodeId) }`
            },
            params: {
                userId: 'user1',
                nodeId: 'node1'
            }
        };
        const querySet = Relay.getQueries(Container, queryConfig);
        const serverData = [
            {
                user: {query: toGraphQL.Query(querySet.user), data: data.user.data},
                node: {query: toGraphQL.Query(querySet.node), data: data.node.data}
            }
        ];

        var networkLayer;

        beforeEach(() => {
            networkLayer = {
                supports() {},
                sendQueries: jest.fn()
            };
            relayEnv.env = new ClientEnvironment();
            relayEnv.env.injectNetworkLayer(networkLayer);
        });


        it('should receive data injected from the server and not run queries', () => {
            return new Promise(resolve => {
                relayEnv.env.isomorphicInjectServerData(serverData).then(() => {
                    shallow(
                        <Wrapper userId="user1" nodeId="node1" />,
                        {context: {relayEnv: {...relayEnv, initialRender: true}}}
                    );
                    resolve();
                });
            }).then(() => {
                expect(networkLayer.sendQueries).not.toBeCalled();
            });
        });

        it('should render a Relay.ReadyStateRenderer after injection', () => {
            return new Promise(resolve => {
                relayEnv.env.isomorphicInjectServerData(serverData).then(() => {
                    const wrapper = shallow(
                        <Wrapper userId="user1" nodeId="node1" />,
                        {context: {relayEnv: {...relayEnv, initialRender: true}}}
                    );
                    expect(wrapper.node.type).toBe(Relay.ReadyStateRenderer);
                    expect(wrapper.node.props.readyState).toBe(relayEnv.env.isomorphicQueriesMap.values()[0].readyState);
                    resolve();
                });
            });
        });

        it('should provide query readyState from the isomorphicRunQueriesOrGetReadyState method', () => {
            return new Promise(resolve => {
                relayEnv.env.isomorphicInjectServerData(serverData).then(() => {
                    expect(relayEnv.env.isomorphicRunQueriesOrGetReadyState(Container, queryConfig)).toEqual(jasmine.objectContaining({
                        done: true,
                        error: null,
                        aborted: false,
                        ready: true,
                        stale: false
                    }));
                    resolve();
                });
            });
        });

        it('should use Relay.Environment.primeCache and storeData.handleQueryPayload', () => {
            relayEnv.env.primeCache = jest.fn(relayEnv.env.primeCache.bind(relayEnv.env));
            const storeData = relayEnv.env.getStoreData();
            storeData.handleQueryPayload = jest.fn(storeData.handleQueryPayload.bind(storeData));
            return new Promise(resolve => {
                relayEnv.env.isomorphicInjectServerData(serverData).then(() => {
                    // Check that the underlying relay methods are called as they should be
                    expect(relayEnv.env.primeCache.mock.calls.length).toEqual(1);
                    const [
                        [querySet]
                    ] = relayEnv.env.primeCache.mock.calls;
                    expect(Object.keys(querySet)).toEqual(['user', 'node']);

                    expect(storeData.handleQueryPayload.mock.calls.length).toEqual(2);
                    storeData.handleQueryPayload.mock.calls.forEach(([query, result]) => {
                        if (result.user) {
                            expect(query.equals(querySet.user)).toBe(true);
                            expect(result).toBe(data.user.data);
                        } else {
                            expect(query.equals(querySet.node)).toBe(true);
                            expect(result).toBe(data.node.data);
                        }
                    });
                    resolve();
                });
            });
        });

        it('should behave as normal when no server data is injected', () => {
            const wrapper = shallow(
                <Wrapper userId="user1" nodeId="node1" />,
                {context: {relayEnv: {...relayEnv, initialRender: true}}}
            );
            expect(wrapper.node.type).toBe(Relay.Renderer);
        });

        it('should handle a graphql query failure', () => {
            var failedServerData = [
                {node: serverData[0].node}
            ];

            return new Promise(resolve => {
                relayEnv.env.isomorphicInjectServerData(failedServerData).then(() => {
                    const wrapper = shallow(
                        <Wrapper userId="user1" nodeId="node1" />,
                        {context: {relayEnv: {...relayEnv, initialRender: true}}}
                    );
                    expect(wrapper.node.type).toBe(Relay.Renderer);
                    resolve();
                });
            });
        });
    });
});
