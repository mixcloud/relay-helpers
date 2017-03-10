/* @noflow */
import Relay from 'react-relay';


export default function createMockRelayEnv() {
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
