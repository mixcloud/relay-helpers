# Relay Helpers 

[ ![Codeship Status for mixcloud/relay-helpers](https://app.codeship.com/projects/f98f46c0-e185-0134-6c99-0215fb10e28e/status?branch=master)](https://app.codeship.com/projects/205541)

Helpers to simplify and enhance Relay (https://facebook.github.io/relay/) including:

 * Decorators to simplify the Renderer and Mutation APIs
 * TTL on queries
 * Simple way to reset the Relay store
 * Simple server side rendering

and more!

## Why?

We're waiting for Relay 2 but in the meantime we wanted to fill some gaps in the features and tidy up the API a bit.

## We're hiring!

If you like working with React and GraphQL and you're interested in building the future of radio check out https://www.mixcloud.com/jobs/

## Installation

```
npm install relay-helpers
```

## RelayEnvProvider

`RelayEnvProvider` is a component that provides the Relay Environment on context. It is used by everything else in
`relay-helpers`.

```javascript
import Relay from 'react-relay/classic';
import {RelayEnvProvider} from 'relay-helpers';


const env = new Relay.Environment();


class App extends React.Component {
    render() {
        return (
            <RelayEnvProvider initialEnv={env}>
                {/* ... the rest of your app ... */}
            </RelayEnvProvider>
        );
    }
}
```

### Resetting the store

Under some circumstances you will want to reset the entire store (e.g. log in or log out). The context provided by
`RelayEnvProvider` has a `reset()` method:

```javascript
import Relay from 'react-relay/classic';
import {RelayEnvProvider, RelayEnvContextType} from 'relay-helpers';


class LogoutButton extends React.Component {
    static contextTypes = {relayEnv: RelayEnvContextType};
    
    onClick = () => {
        // Log out...
        
        // This will create a new relay environment and refresh any renderers on the page that were created using
        // withRelayRenderer or withRelayQuery
        this.context.relayEnv.reset();
    };
    
    render() {
        return <div onClick={this.onClick}>Logout</div>;
    }
}


class App extends React.Component {
    render() {
        // Pass a `createEnv` prop to RelayEnvProvider that will be called on init and when `reset()` is called
        return (
            <RelayEnvProvider createEnv={() => new Relay.Environment()}>
                <LogoutButton />
            </RelayEnvProvider>
        );
    }
}
```

## Higher Order Components

### createRelayContainer

A simple wrapper for `Relay.createContainer` so that it can be used like other higher order components and with tools
such as recompose.

e.g.
```javascript
import {createRelayContainer} from 'relay-helpers';
import {connect} from 'react-redux';
import compose from 'recompose/compose';


const MyContainer = createRelayContainer({fragments: {...}})(MyComponent);


const MyWrappedComponent = compose(
    createRelayContainer({
        initialVariables: {count: 10},
        fragments: {
            user: () => Relay.QL`...`
        }
    }),
    connect(),
    // ... other higher order components
)(MyComponent);
```

### withRelayRenderer

`withRelayRenderer` can be used to simplify the process of creating a Relay.Renderer. Instead of needing a Renderer
and a Route you can just decorate the component. In most circumstances you can probably use `withRelayQuery` - this
is provided as a lower level alternative.

Note: `withRelayQuery` or `withRelayRenderer` must be used if you want to make use of `context.relayEnv.reset()`.

```javascript
import {withRelayRenderer} from 'relay-helpers';


function Username({loading, error, offline, user}) {
    // Note: unlike Relay.Renderer, withRelayRenderer will render your component
    // with `loading`, `error`, and `offline` props.
    // If this is not the behaviour you want a higher order component that only renders if !loading && !error
    if (loading) {
        return <div>Loading...</div>;
    }
    
    // `offline` is true if error is a TypeError with message "Network request failed"
    // the error is still passed in as `error`
    if (offline) {
        return <div>Check your internet connection...</div>;
    }
    
    if (error) {
        return <div>Something went wrong...</div>;
    }
    
    // Data props passed is as usual
    return <div>{user.username}</div>;
}


Username = compose(
    // withRelayRenderer wraps a Relay Container
    withRelayRenderer({
        // like a Relay Route
        queryConfig: {
            name: 'UsernameQuery',
            queries: {
                user: () => Relay.QL`
                    query {
                        user(id: $userId)
                    }
                `
            },
            // params will be taken from props
            // PropTypes are generated to ensure required params aren't missed
            params: {
                userId: {required: true}
            }
        },
        // forceFetch on mount if we haven't seen a success from this query in the past hour (optional)
        ttl: 1000 * 60 * 60 * 1,
        // always forceFetch this component (optional)
        forceFetch: true
    }),
    createRelayContainer({
        fragments: {
            user: () => Relay.QL`
                fragment on User {
                    username
                }
            `
        }
    })
)(Username);
    
    
function App() {
    // params are taken from props
    return <Username userId="user1" />;
}
```

#### Changing the query based on props

Instead of providing a `queryConfig` object you can provide a function:

```javascript
queryConfig: (props, Container) => {
    return {
        name: 'UsernameQuery',
        queries: {
            user: () => Relay.QL`
                query {
                    user(id: $userId)
                }
            `
        },
        params: {
            userId: props.myUserIdParam
        }
    };
}
```

This will be called every time props changes.

### withRelayQuery

`withRelayQuery` is a higher level higher order component that enables you to create a component with a query
very quickly.

```javascript
import {withRelayQuery} from 'relay-helpers';

function Username({loading, ...as before

// Note: createContainer is not required
Username = withRelayQuery({
    query: Relay.QL`
        query {
            user(id: $userId) {
                username
            }
        }
    `,
    params: {
        userId: {required: true}
    }
})(Username);
```
If there is more than one query:
```javascript
const UserWithTodo = withRelayQuery({
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
                todo(id: $todoId) {
                    name
                }
            }
        `
    ],
    params: {
        userId: {required: true},
        todoId: {required: true}
    }
})(Username);
```

#### Options

 * `query` EITHER a Relay.QL of a full query (not separated into queries and fragments) OR an array of Relay.QL (if you have more than one root) 
 * `name` (optional) name the query - by default the component name will be used
 * `params` EITHER param definitions OR a function: `(props) => ({paramName: 'value', ...})`
 * `initialVariables` as you would provide to Relay.createContainer
 * `withHelpers` optionally wrap in the `withRelayHelpers` higher order component
 * `forceFetch` and `ttl` (same as `withRelayRenderer`)
 
#### How it works

`withRelayQuery` splits the Relay.QL into the parts required for the route and fragments. This might not work in all
circumstances.

#### Note about fragment variables

It is possible to have variables that aren't params (in the same way as you can with separate Route and Container) and
it is possible to set those variable values from props. For example:

```javascript
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
    params: ({userId}) => ({userId, limit: 5}),  // Or params: {userId: {required: true}}
    initialVariables: {limit: null}  // Note: this is still necessary
})(TestComponent);
```

### withRelayHelpers

Provides `setVariables` and `forceFetch` props equivalent to `props.relay.setVariables` and `props.relay.forceFetch`
that return promises instead of taking callbacks.

```javascript
import {withRelayHelpers} from 'relay-helpers';

function MyComponent({setVariables, relay}) {
    function onClick() {
        setVariables({count: relay.variables.count}).then(() => {
            // Done
        });
    }
    return <div onClick={onClick}>Load more</div>;
}

MyComponent = compose(
    createRelayContainer(...),
    withRelayHelpers()    
)(MyComponent);
```

## Mutations

`context.relayEnv` provides a `mutate` function that wraps `Relay.GraphQLMutation`:

```javascript
context.relayEnv.mutate({
    query: Relay.QL`
        mutation {
            ...
        }
    `,
    variables: {...},
    files: {...},
    optimisticResponse: {...},
    configs: [...]
}).then(() => {
    // success!
});
```

### `withRelayMutations`

If you define mutation functions like so:

```javascript
const myMutation = mutate => (arg1, arg2) => mutate({
    query: Relay.QL`...`
    ... other relayEnv.mutate options
});
```
You can use `withRelayMutations` to provide the mutation as a prop to the component:

```javascript
import {withRelayMutations} from 'relay-helpers';


function MyComponent({myMutation}) {
    function onClick() {
        myMutation('arg1', 'arg2').then(() => {
            // success!
        });
    }
    
    return <div onClick={onClick}>Click Me!</div>;
}

// myMutation from above
MyComponent = withRelayMutations({myMutation})(MyComponent);
```

## Server side (isomorphic) rendering

Server and Client Relay Environments are provided that, combined with `RelayEnvProvider` and
`withRelayRenderer`/`withRelayQuery`, can enable isomorphic rendering.

    Note: you can provide an `isomorphic: false` option to `withRelayRenderer` and `withRelayQuery` if you do not want them to be included in server side rendering

On the server:
```javascript
import {ServerEnvironment} from 'relay-helpers';

// Provide a function to get graphql query responses
// getQueryResponse = (query: {query: string, variables: Object}) => Promise<{errors?: Array<Object>, data?: Object}>

const env = new ServerEnvironment(getQueryResponse);

function MyApp() {
    return (
        <RelayEnvProvider initialEnv={env}>
            {/* the rest of the app */}
        </RelayEnvProvider>
    );
}

// This will recursively find queries and run them
env.isomorphicGetData(<MyApp />).then((markup) => {
    // markup = ReactDOMServer.renderToString(<MyApp />);
    
    // query data is ready
    const relayData = env.isomorphicClientData;
    
    // return the markup to the user and include relayData somehow
    // (probably JSON.strinfigy and put in a hidden DOM element)
});

```

On the client:
```javascript
import {ClientEnvironment} from 'relay-helpers';


const env = new ClientEnvironment();

// env.injectNetworkLayer ... etc

function MyApp() {
    return (
        <RelayEnvProvider initialEnv={env}>
            {/* the rest of the app */}
        </RelayEnvProvider>
    );
}


const serverData = ...  // Get the data from the server (probably from the hidden DOM element)

env.isomorphicInjectServerData(serverData).then(() => {
    // Data has been injected into Relay store
    ReactDOM.render(<MyApp />, ...);
});
```

## Caching

### `querySubscriberDecorator`

`querySubscriberDecorator` is a helper that can be used, for example, to create an offline cache for Relay.

Usage:

```javascript
var env = new Relay.Environment();

// A simple cache example - this could be persisted to localStorage, for example
var cache = {};


// We listen for all queries
env.addNetworkSubscriber(querySubscriberDecorator((queryName, variables, result) => {
    // The helper converts Relay's QueryRequest into something a bit more useful
    
    // Selectively choose what you want to cache
    if (queryName === 'UserProfile') {
        const cacheKey = `${queryName}|${JSON.stringify(variables)}`;
        cache[cacheKey] = result;
    }
}));
```

The `result` that `querySubscriberDecorator` passes in is compatible with the `ServerData` used for isomorphic rendering. They
can be injected into the store in the same way (whether you are using server side rendering or not):

```javascript
var env = new ClientEnvironment();

// "cache" from the code above - for example loaded from localStorage 
const localResults = Object.keys(cache).map(key => cache[key]);

// Concatenating serverData and localResults - just pass localResults if you're not using isomorphic rendering
env.isomorphicInjectServerData([...serverData, ...localResults]).then(() => {
    // render...
});

```

## Tests

Some helpers are provided for testing.

### Relay.Renderer mock

```javascript
// Either
import {MockRelayRenderer} from 'relay-helpers/lib/tests/mocks';
// or
import {Relay as MockedRelay} from 'relay-helpers/lib/tests/mocks';
```

Usage (example using jest, but jest isn't required):

```javascript
import Relay from 'react-relay/classic';

jest.mock('react-relay/classic', () => {
    return require('relay-helpers/lib/tests/mocks').Relay;
});

describe('test', () => {
    it('should render loading state', () => {
        Relay.Renderer.nextRenderResult = {};
        // render a component that has a relay renderer in it
    });
    
    it('should render ready state', () => {
        Relay.Renderer.nextRenderResult = {
            props: {
                user: {...}
            }
        };
        // render a component that has a relay renderer in it
    });
});
```

### `createMockRelayEnv`

This requires jest but will provide a mocked relayEnv context.

### `expect(relayEnvContext).toHaveMutated`

Also requires jest.

```javascript
const relayEnv = createMockRelayEnv();
expect(relayEnv).not.toHaveMutated();

const wrapper = shallow(<MyComponent />, {context: {relayEnv}});

// ... do something that causes a mutation such as:
relayEnv.mutate({
    query: {name: 'MyQueryName'},
    variables: {my: 'variable'}
});

expect(relayEnv).toHaveMutated();
expect(relayEnv).toHaveMutated('MyQueryName', {my: 'variable'});
expect(relayEnv).toHaveMutated('MyQueryName', {my: jasmine.any(String)});
```
