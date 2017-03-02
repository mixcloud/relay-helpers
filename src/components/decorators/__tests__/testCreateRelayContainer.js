/* @noflow */
import createRelayContainer from '../createRelayContainer';
import Relay from 'react-relay';

jest.mock('react-relay', () => ({
    createContainer: jest.fn(() => ({test: 'component'}))
}));


describe('createRelayContainer', () => {
    it('should call Relay.createContainer', () => {
        function TestComponent() {}
        const config = {initialVariables: {}, fragments: {}};
        const Container = createRelayContainer(config)(TestComponent);
        expect(Relay.createContainer).toBeCalledWith(TestComponent, config);
        expect(Container).toEqual({test: 'component'});
    });
});
