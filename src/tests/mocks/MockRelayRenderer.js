/* @noflow */
import React from 'react';


export default class MockRelayRenderer extends React.Component {
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
