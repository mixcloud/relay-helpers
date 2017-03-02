/* @noflow */
import React from 'react';
import withRelayMutations from '../withRelayMutations';
import {createMockRelayEnv} from '../../../tests/mocks';
import {shallow} from 'enzyme';


function TestComponent() {}

describe('withRelayMutations', () => {
    it('should provide mutations as props', () => {
        const relayEnv = createMockRelayEnv();
        const mutations = {
            mutation1: (mutate) => (a) => {
                mutate('mutation1', a);
                return 1;
            },
            mutation2: (mutate) => (a, b) => {
                mutate('mutation2', a, b);
                return 2;
            }
        };
        const Wrapper = withRelayMutations(mutations)(TestComponent);
        const wrapper = shallow(<Wrapper />, {context: {relayEnv}});
        expect(wrapper.props().mutation1('arg1')).toEqual(1);
        expect(wrapper.props().mutation2('arg2', 1)).toEqual(2);
        expect(relayEnv.mutate.mock.calls).toEqual([
            ['mutation1', 'arg1'],
            ['mutation2', 'arg2', 1]
        ]);
    });
});
