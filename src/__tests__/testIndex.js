/* @noflow */
import RelayHelpers from '../';


describe('Public interface', () => {
    it('should export things publicly', () => {
        expect('RelayEnvProvider' in RelayHelpers).toBe(true);
        expect('createRelayContainer' in RelayHelpers).toBe(true);
        expect('withRelayQuery' in RelayHelpers).toBe(true);
        expect('withRelayHelpers' in RelayHelpers).toBe(true);
        expect('withRelayRenderer' in RelayHelpers).toBe(true);
        expect('withRelayMutations' in RelayHelpers).toBe(true);
        expect('ServerEnvironment' in RelayHelpers).toBe(true);
        expect('ClientEnvironment' in RelayHelpers).toBe(true);
    });
});
