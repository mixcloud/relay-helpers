/* @noflow */
import mutate from '../mutate';
import Relay from 'react-relay';

jest.mock('react-relay', () => {
    const Relay = {
        mutations: [],
    };
    Relay.GraphQLMutation = class {
        constructor(...args) {
            this.args = args;
            Relay.mutations.push(this);
        }

        applyOptimistic = jest.fn();
        commit = jest.fn();
    };
    return Relay;
});


describe('mutate', () => {
    beforeEach(() => {
        Relay.mutations = [];
    });

    it('should create a Relay.GraphQLMutation and commit it', () => {
        const env = {env: 1};
        mutate(env, {
            query: {q: 1},
            variables: {v: 1},
            files: {f: 1},
            configs: {c: 1}
        });
        expect(Relay.mutations.length).toEqual(1);
        expect(Relay.mutations[0].args).toEqual([{q: 1}, {v: 1}, {f: 1}, env, {onSuccess: jasmine.any(Function), onFailure: jasmine.any(Function)}]);
        expect(Relay.mutations[0].applyOptimistic).not.toBeCalled();
        expect(Relay.mutations[0].commit).toBeCalledWith({c: 1});
    });

    it('should handle optimistic responses', () => {
        mutate({}, {
            query: {q: 1},
            optimisticResponse: {o: 1},
            configs: [{c: 1}]
        });
        expect(Relay.mutations.length).toEqual(1);
        expect(Relay.mutations[0].applyOptimistic).toBeCalledWith({q: 1}, {o: 1}, [{c: 1}]);
        expect(Relay.mutations[0].commit).toBeCalledWith([{c: 1}]);
    });

    it('should return a promise and handle onSuccess', () => {
        return new Promise(resolve => {
            mutate({}, {}).then(resolve);
            Relay.mutations[0].args[4].onSuccess();
        });
    });

    it('should return a promise and handle onFailure', () => {
        return new Promise(resolve => {
            mutate({}, {}).then(null, resolve);
            Relay.mutations[0].args[4].onFailure({getError: () => "Error message"});
        }).then((error) => {
            expect(error).toBe("Error message");
        });
    });
});
