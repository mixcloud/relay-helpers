/* @noflow */
import Relay from 'react-relay/classic';
import RelayFragmentReference from 'react-relay/lib/RelayFragmentReference';
import {wraps, splitQuery, namedQuery} from '../utils';
import createRelayContainer from '../components/decorators/createRelayContainer';


describe('utils', () => {
    describe('wraps', () => {
        it('should add and hoist statics', () => {
            function Wrapper() {}
            function TestComponent() {}
            TestComponent.WrappedComponent = 'test'; // This should not be hoisted
            TestComponent.myStatic = 'test';
            expect(wraps(TestComponent, Wrapper, 'MyDisplayName')).toBe(Wrapper);
            expect(Wrapper.displayName).toEqual('MyDisplayName');
            expect(Wrapper.WrappedComponent).toBe(TestComponent);
            expect(Wrapper.myStatic).toEqual('test');
        });
    });

    describe('splitQuery', () => {
        it('should split a Relay.QL', () => {
            const query = Relay.QL`
                query {
                    user(id: $id) {
                        username
                    }
                }
            `;

            const routeQuery = Relay.QL`
                query MyQueryName {
                    user(id: $id)
                }
            `;

            const fragment = Relay.QL`
                fragment on User {
                    username
                }
            `;
            fragment.name = 'MyQueryName_Fragment';
            fragment.id = jasmine.any(String);

            expect(splitQuery(query, 'MyQueryName')).toEqual({routeQuery, fragment});
        });

        it('should split more complex queries', () => {
            const query = Relay.QL`
                query {
                    user(id: $id) {
                        username
                        todos(limit: $limit) {
                            title
                            completed
                        }
                    }
                }
            `;

            const routeQuery = Relay.QL`
                query MyQueryName {
                    user(id: $id)
                }
            `;

            const fragment = Relay.QL`
                fragment on User {
                    username
                    todos(limit: $limit) {
                        title
                        completed
                    }
                }
            `;
            fragment.name = 'MyQueryName_Fragment';
            fragment.id = jasmine.any(String);

            expect(splitQuery(query, 'MyQueryName')).toEqual({routeQuery, fragment});
        });

        it('should split queries with fragments', () => {
            const Container = createRelayContainer({
                fragments: {
                    todo: () => Relay.QL`
                        fragment on Todo {
                            title
                            completed
                        }
                    `
                }
            })(() => {});

            const query = Relay.QL`
                query {
                    user(id: $id) {
                        username
                        todos(limit: $limit) {
                            ${Container.getFragment('todo')}
                        }
                    }
                }
            `;

            const routeQuery = Relay.QL`
                query MyQueryName {
                    user(id: $id)
                }
            `;

            const fragment = Relay.QL`
                fragment on User {
                    username
                    todos(limit: $limit) {
                        ${Container.getFragment('todo')}
                    }
                }
            `;
            fragment.name = 'MyQueryName_Fragment';
            fragment.id = jasmine.any(String);
            fragment.children[1].children[1] = jasmine.any(RelayFragmentReference);

            expect(splitQuery(query, 'MyQueryName')).toEqual({routeQuery, fragment});
        });

        it('should handle generated ids', () => {
            const query = Relay.QL`
                query {
                    node(id: $nodeId) {
                        id
                    }
                }
            `;

            const routeQuery = Relay.QL`
                query MyQueryName {
                    node(id: $nodeId)
                }
            `;

            const fragment = Relay.QL`
                fragment on Node {
                    id
                }
            `;

            fragment.name = 'MyQueryName_Fragment';
            fragment.id = jasmine.any(String);

            expect(splitQuery(query, 'MyQueryName')).toEqual({routeQuery, fragment});
        });
    });

    describe('namedQuery', () => {
        it('should add a name to a query', () => {
            const named = namedQuery('MyName', () => Relay.QL`query { user(id: $userId) }`);
            expect(named().name).toEqual('MyName');
        });

        it('should add a name to a query with args', () => {
            const queryFactory = jest.fn(() => Relay.QL`query { user(id: $userId) }`);
            const named = namedQuery('MyName', queryFactory);
            expect(named('arg1', 2).name).toEqual('MyName');
            expect(queryFactory).toBeCalledWith('arg1', 2);
        });
    });
});
