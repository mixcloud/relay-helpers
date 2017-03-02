/* @noflow */
import React from 'react';
const RelayActual = require.requireActual('react-relay');


export class MockRelayRenderer extends React.Component {
    static nextRenderResult = {};

    render() {
        const {nextRenderResult} = this.constructor;
        if (nextRenderResult.offline) {
            nextRenderResult.error = new TypeError('Network request failed');
            delete nextRenderResult.offline;
        }

        return this.props.render(nextRenderResult);
    }
}


export const Relay = {
    ...RelayActual,
    Renderer: MockRelayRenderer
};


export function createMockRelayEnv() {
    const env = new Relay.Environment();
    return {
        env,
        onQuerySuccess: () => {},
        reset: () => {},
        initialRender: false,
        addResetListener: () => {},
        removeResetListener: () => {},
        shouldForceFetch: () => {},
        mutate: jest.fn(() => Promise.resolve())
    };
}
