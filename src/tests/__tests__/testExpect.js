/* @noflow */
import {createMockRelayEnv} from '../mocks';
require('../expect');


describe('expect extensions', () => {
    it('toHaveMutated', () => {
        const relayEnv = createMockRelayEnv();
        expect(relayEnv).not.toHaveMutated();
        relayEnv.mutate({
            query: {name: 'MyQueryName'},
            variables: {my: 'variable'}
        });
        expect(relayEnv).toHaveMutated();
        expect(relayEnv).toHaveMutated('MyQueryName', {my: 'variable'});
        expect(relayEnv).toHaveMutated('MyQueryName', {my: jasmine.any(String)});
        expect(relayEnv).not.toHaveMutated('MyQueryName2', {my: 'variable'});

        expect(() => {
            expect({}).toHaveMutated();
        }).toThrow();
    });
});
