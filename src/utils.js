/* @flow */
import React from 'react';
import Relay from 'react-relay';
import hoistNonReactStatics from 'hoist-non-react-statics';

export type WrappedComponent<P> = ReactClass<P> | (props: P) => ?React.Element<*>;

export function wraps<P>(Component: ReactClass<P>, Wrapper: WrappedComponent<P>, displayName: ?string) {
    Wrapper.WrappedComponent = Component;
    if (displayName) {
        Wrapper.displayName = displayName;
    }
    hoistNonReactStatics(Wrapper, Component);
    return Wrapper;
}


var nextFragmentId = 1;
/*
Converting the output of:

Relay.QL`
    query {
        node(id: $id) {
            myField
        }
    }
`

to:

{
    routeQuery: Relay.QL`
        query {
            node(id: $id)
        }
    `,
    fragment: Relay.QL`
        fragment on Node {
            myField
        }
    `
}

This was created by examining the output of Relay.QL so there's a relatively high chance it only works by luck
*/
export function splitQuery(query: Relay.QL, name: string = 'Index'): {routeQuery: Relay.QL, fragment: Relay.QL} {
    const routeQuery = {
        ...query,
        name,
        children: query.children.filter(
            ({metadata}) => metadata && (metadata.isGenerated || metadata.isRequisite)
        ).map(
            ({metadata, ...child}) => ({metadata: {...metadata, isGenerated: true}, ...child})
        )
    };
    const fragment = {
        id: `${nextFragmentId++}::relayhelperid`, // assuming this ID can be made up like this
        kind: 'Fragment',
        type: query.type,
        metadata: {},
        name: `${name}_Fragment`,
        children: query.children
    };
    if (query.metadata.isAbstract) {
        fragment.metadata.isAbstract = true;
    }
    return {routeQuery, fragment};
}
