/* @noflow */
import React from 'react';
import Relay from 'react-relay/classic';
import withRelayQuery from '../withRelayQuery';
import {shallow, mount} from 'enzyme';
import createMockRelayEnv from "../../../tests/mocks/createMockRelayEnv";


function TestComponent() { return null; }


describe('withRelayQuery', () => {
    var relayEnv,
        mockContext;
    beforeEach(() => {
        relayEnv = createMockRelayEnv();
        mockContext = {relayEnv};
    });

    it('should name the query', () => {
        const Wrapper = withRelayQuery({
            query: Relay.QL`
                query {
                    user(id: $id) {
                        username
                    }
                }
            `
        })(TestComponent);
        const wrapper = shallow(<Wrapper />, {context: mockContext});
        expect(wrapper.props().queryConfig.name).toEqual('TestComponent');
    });

    it('should split the query into query and fragments', () => {
        const Wrapper = withRelayQuery({
            query: Relay.QL`
                query {
                    user(id: $id) {
                        username
                    }
                }
            `,
            params: {
                id: {required: true}
            }
        })(TestComponent);
        const wrapper = shallow(<Wrapper id="test" />, {context: mockContext});
        expect(wrapper.props().queryConfig.queries).toEqual({
            user: jasmine.any(Function)
        });
        expect(wrapper.props().queryConfig.params).toEqual({
            id: "test"
        });
        expect(Wrapper.WrappedComponent.getFragmentNames()).toEqual(['user']);
    });

    it('should handle multiple queries', () => {
        const Wrapper = withRelayQuery({
            query: [
                Relay.QL`
                    query {
                        user(id: $id) {
                            username
                        }
                    }
                `,
                Relay.QL`
                    query {
                        node(id: $id) {
                            id
                        }
                    }
                `
            ]
        })(TestComponent);
        const wrapper = shallow(<Wrapper />, {context: mockContext});
        expect(wrapper.props().queryConfig.queries).toEqual({
            user: jasmine.any(Function),
            node: jasmine.any(Function)
        });
        expect(Wrapper.WrappedComponent.getFragmentNames()).toEqual(['user', 'node']);
    });

    it('should handle option.params as a function', () => {
        const Wrapper = withRelayQuery({
            query: Relay.QL`
                query {
                    user(id: $id) {
                        username
                    }
                }
            `,
            params: (props) => ({id: props.myIdProp})
        })(TestComponent);
        const wrapper = shallow(<Wrapper myIdProp="test1" />, {context: mockContext});
        expect(wrapper.props().queryConfig.params).toEqual({id: "test1"});
        wrapper.setProps({myIdProp: 'test2'});
        expect(wrapper.props().queryConfig.params).toEqual({id: "test2"});
    });

    it('should create a container with initialVariables and fragments', () => {
        const Wrapper = withRelayQuery({
            query: Relay.QL`
                query {
                    user(id: $id) {
                        username
                    }
                }
            `,
            initialVariables: {
                myInitialVar: 'val'
            }
        })(TestComponent);
        expect(Wrapper.WrappedComponent.getFragmentNames()).toEqual(['user']);
        expect(Wrapper.WrappedComponent.hasVariable('myInitialVar')).toBe(true);
    });

    it('should handle complex variable scenarios', () => {
        jest.useFakeTimers();
        const Wrapper = withRelayQuery({
            query: Relay.QL`
                query {
                    user(id: $userId) {
                        todos(limit: $limit) {
                            title
                        }
                    }
                }
            `,
            params: ({userId}) => ({userId, limit: 5}),
            initialVariables: {limit: null}
        })(TestComponent);
        relayEnv.env.injectNetworkLayer({supports() {}, sendQueries(r) {
            // This throws an error if $limit isn't provided correctly
            expect(r[0].getQueryString.bind(r[0])).not.toThrow();
        }});

        mount(<Wrapper userId="user1" />, {context: mockContext});
        jest.runAllTimers();
    });
});
