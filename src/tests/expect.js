/* @noflow */


expect.extend({
    toHaveMutated(relayEnv, mutationName, mutationVariables = {}) {
        if (!(relayEnv.mutate && relayEnv.mutate.mock)) {
            throw Error(`${relayEnv} does not appear to be a mocked relayEnv`);
        }
        const calls = relayEnv.mutate.mock.calls.map(call => {
            const [{query: {name}, variables}] = call;
            return {name, variables};
        });
        var pass;
        if (mutationName) {
            pass = !!calls.find(({name, variables}) => name === mutationName && jasmine.matchersUtil.equals(variables, mutationVariables));
        } else {
            pass = !!calls.length;
        }
        const message = () => `expected ${JSON.stringify(calls, null, 4)} ${pass ? 'not' : ''} to include mutation ${mutationName} with variables ${JSON.stringify(mutationVariables, null, 4)}`;
        return {message, pass};
    }
});
