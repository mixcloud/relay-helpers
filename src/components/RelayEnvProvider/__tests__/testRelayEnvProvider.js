/* @noflow */
import React from 'react';
import Relay from 'react-relay';
import RelayEnvProvider from '../';
import {shallow} from 'enzyme';
import mutate from '../../../mutate';


jest.mock('../../../mutate', () => jest.fn());


describe('<RelayEnvProvider />', () => {
    it('should provide a relay environment on context', () => {
        const env = new Relay.Environment();
        const wrapper = shallow(
            <RelayEnvProvider initialEnv={env}>
                <div />
            </RelayEnvProvider>
        );
        const relayEnv = wrapper.instance().getChildContext().relayEnv;
        expect(relayEnv).toEqual({
            env,
            reset: jasmine.any(Function),
            initialRender: true,
            addResetListener: jasmine.any(Function),
            removeResetListener: jasmine.any(Function),
            shouldForceFetch: jasmine.any(Function),
            onQuerySuccess: jasmine.any(Function),
            mutate: jasmine.any(Function)
        });
    });

    it('should reset the relay environment and call reset listeners', () => {
        const env1 = new Relay.Environment(),
            env2 = new Relay.Environment();

        const wrapper = shallow(
            <RelayEnvProvider initialEnv={env1} createEnv={() => env2}>
                <div />
            </RelayEnvProvider>
        );
        const instance = wrapper.instance();
        const relayEnv = instance.getChildContext().relayEnv;
        const callback = jest.fn();
        relayEnv.addResetListener(callback);
        expect(relayEnv.env).toBe(env1);

        relayEnv.reset();
        expect(relayEnv.env).toBe(env2);
        expect(callback).toBeCalled();

        callback.mockClear();
        relayEnv.removeResetListener(callback);

        relayEnv.reset();
        expect(callback).not.toBeCalled();
    });

    it('should set initialRender to false after render', () => {
        const wrapper = shallow(
            <RelayEnvProvider initialEnv={new Relay.Environment()}>
                <div />
            </RelayEnvProvider>
        );
        const relayEnv = wrapper.instance().getChildContext().relayEnv;
        expect(relayEnv.initialRender).toBe(true);
        wrapper.instance().componentDidMount();
        expect(relayEnv.initialRender).toBe(false);
    });

    it('should use initialEnv or createEnv', () => {
        const env1 = new Relay.Environment(),
            env2 = new Relay.Environment();

        var wrapper = shallow(<RelayEnvProvider initialEnv={env1} createEnv={() => env2}><div /></RelayEnvProvider>);
        var relayEnv = wrapper.instance().getChildContext().relayEnv;
        expect(relayEnv.env).toBe(env1);

        wrapper = shallow(<RelayEnvProvider createEnv={() => env2}><div /></RelayEnvProvider>);
        relayEnv = wrapper.instance().getChildContext().relayEnv;
        expect(relayEnv.env).toBe(env2);
    });

    it('should provide a mutate method', () => {
        const env = new Relay.Environment();
        var wrapper = shallow(<RelayEnvProvider initialEnv={env}><div /></RelayEnvProvider>);
        var relayEnv = wrapper.instance().getChildContext().relayEnv;
        relayEnv.mutate({test: 1});
        expect(mutate).toBeCalledWith(env, {test: 1});
    });

    describe('ttl cache (shouldForceFetch)', () => {
        var relayEnv,
            instance;
        beforeEach(() => {
            const wrapper = shallow(
                <RelayEnvProvider initialEnv={new Relay.Environment()}>
                    <div />
                </RelayEnvProvider>
            );
            instance = wrapper.instance();
            relayEnv = instance.getChildContext().relayEnv;
        });

        it('should return true if not in the cache', () => {
            expect(relayEnv.shouldForceFetch({name: 'somename', params: {some: 'params'}})).toBe(true);
        });

        it('should return false if in the cache and updated since ttl', () => {
            Date.now = () => 10000;
            relayEnv.onQuerySuccess({name: 'somename', params: {some: 'params'}});
            Date.now = () => 20000;
            expect(relayEnv.shouldForceFetch({name: 'somename', params: {some: 'params'}}, 15000)).toBe(false);
        });

        it('should return false if in the cache and updated since ttl', () => {
            Date.now = () => 10000;
            relayEnv.onQuerySuccess({name: 'somename', params: {some: 'params'}});
            Date.now = () => 20000;
            expect(relayEnv.shouldForceFetch({name: 'somename', params: {some: 'params'}}, 1000)).toBe(true);
        });

        it('should garbage collect', () => {
            Date.now = () => 1000;
            relayEnv.onQuerySuccess({name: 'somename', params: {some: 'params'}});
            expect(Object.keys(instance._queryFetchCache.cache).length).toEqual(1);
            relayEnv.onQuerySuccess({name: 'somename2', params: {some: 'params'}});
            expect(Object.keys(instance._queryFetchCache.cache).length).toEqual(2);

            Date.now = () => 1001 + 24 * 60 * 60 * 1000;
            relayEnv.onQuerySuccess({name: 'somename3', params: {some: 'params'}});
            expect(Object.keys(instance._queryFetchCache.cache).length).toEqual(1);
        });
    });
});
