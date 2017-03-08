/* @noflow */
import React from 'react';
import Relay from 'react-relay';
import withRelayQuery from '../components/decorators/withRelayQuery';
import ClientEnvironment from '../environment/client';
import {querySubscriberDecorator} from "../cache";
import {mount} from 'enzyme';
import {createMockRelayEnv} from '../tests/mocks';


function TestComponent() {
    return null;
}

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


describe('cache', () => {
    var relayEnv;

    beforeEach(() => {
        jest.useFakeTimers();
        relayEnv = createMockRelayEnv();
    });

    it('should provide a query subscriber decorator', () => {
        const cache = {};

        return new Promise(resolve => {
            const env = new ClientEnvironment();

            env.injectNetworkLayer({
                sendQueries(queryRequests) {
                    queryRequests.forEach(queryRequest => {
                        if (queryRequest.getQueryString().match(/user/)) {
                            queryRequest.resolve({response: {user: {username: 'myusername'}}});
                        } else {
                            queryRequest.resolve({response: {node: {id: 'node1', __typename: 'User'}}});
                        }
                    });
                },
                supports() {}
            });

            env.addNetworkSubscriber(querySubscriberDecorator((queryName, variables, result) => {
                const cacheKey = `${queryName}|${JSON.stringify(variables)}`;
                cache[cacheKey] = result;

                expect(cache).toEqual({
                    [`TestComponent|${JSON.stringify({userId: 'user1', nodeId: 'node1'})}`]: {
                        user: {
                            data: {user: {username: 'myusername'}},
                            query: jasmine.any(Object)
                        },
                        node: {
                            data: {node: {id: 'node1', __typename: 'User'}},
                            query: jasmine.any(Object)
                        }
                    }
                });
                resolve();
            }));

            mount(
                <Wrapper userId="user1" nodeId="node1" />,
                {context: {relayEnv: {...relayEnv, env}}}
            );
            jest.runAllTimers();
        }).then(() => {
            const env = new ClientEnvironment();
            const sendQueries = jest.fn();
            env.injectNetworkLayer({sendQueries, supports() {}});

            const data = Object.keys(cache).map(k => cache[k]);
            return env.isomorphicInjectServerData(data).then(() => {
                const wrapper = mount(
                    <Wrapper userId="user1" nodeId="node1" />,
                    {context: {relayEnv: {...relayEnv, initialRender: true, env}}}
                );
                jest.runAllTimers();
                expect(sendQueries).not.toBeCalled();
                expect(wrapper.find(Relay.ReadyStateRenderer).length).toEqual(1);
                expect(wrapper.find(TestComponent).props().user.username).toEqual('myusername');
            });
        });
    });
});
