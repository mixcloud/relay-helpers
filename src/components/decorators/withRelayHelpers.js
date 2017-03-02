/* @flow */
import React from 'react';
import {wraps} from '../../utils';
import type {RelayProp} from 'react-relay/lib/RelayTypes';
import type {WrappedComponent} from '../../utils';


export default <P: {relay: RelayProp}>() => (Component: WrappedComponent<P>) => wraps(Component, (props: P) => {
    const setVariables = (variables) => new Promise((resolve, reject) => {
        props.relay.setVariables(variables, callback.bind(null, resolve, reject));
    });

    const forceFetch = (variables) => new Promise((resolve, reject) => {
        props.relay.forceFetch(variables, callback.bind(null, resolve, reject));
    });

    return (
        <Component
            {...props}
            setVariables={setVariables}
            forceFetch={forceFetch}
        />
    );
}, Component.displayName || Component.name || Component.constructor.name);


function callback(resolve, reject, {error, ready, aborted}) {
    if (ready) {
        resolve();
    } else if (error || aborted) {
        reject();
    }
}
