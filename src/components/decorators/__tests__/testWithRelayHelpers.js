/* @noflow */
import React from 'react';
import {shallow} from 'enzyme';
import withRelayHelpers from "../withRelayHelpers";


function TestComponent() {}
const WithHelpers = withRelayHelpers()(TestComponent);


describe('withRelayHelpers decorator', () => {
    it('should pass other props through', () => {
        const wrapper = shallow(<WithHelpers other="test" />);
        expect(wrapper.props().other).toEqual("test");

        expect(WithHelpers.displayName).toEqual("TestComponent");
    });

    describe('setVariables', () => {
        it('should provide a setVariables prop that calls relay.setVariables and returns a promise', () => {
            const mockRelay = {setVariables: jest.fn()};
            const wrapper = shallow(<WithHelpers relay={mockRelay} />);
            const promise = wrapper.props().setVariables({my: 'variable'});
            expect(promise instanceof Promise).toBe(true);
            expect(mockRelay.setVariables).toBeCalledWith({my: 'variable'}, jasmine.any(Function));
            mockRelay.setVariables.mock.calls[0][1]({ready: true});
            return promise;
        });

        it('should handle errors', () => {
            const mockRelay = {setVariables: jest.fn()};
            const wrapper = shallow(<WithHelpers relay={mockRelay} />);
            const promise = wrapper.props().setVariables({my: 'variable'});
            mockRelay.setVariables.mock.calls[0][1]({error: new Error()});
            return new Promise(resolve => {
                promise.then(() => {}, () => {
                    resolve();
                });
            });
        });

        it('should handle aborts', () => {
            const mockRelay = {setVariables: jest.fn()};
            const wrapper = shallow(<WithHelpers relay={mockRelay} />);
            const promise = wrapper.props().setVariables({my: 'variable'});
            mockRelay.setVariables.mock.calls[0][1]({aborted: true});
            return new Promise(resolve => {
                promise.then(() => {}, () => {
                    resolve();
                });
            });
        });
    });

    describe('forceFetch', () => {
        it('should provide a setVariables prop that calls relay.setVariables and returns a promise', () => {
            const mockRelay = {forceFetch: jest.fn()};
            const wrapper = shallow(<WithHelpers relay={mockRelay} />);
            const promise = wrapper.props().forceFetch({my: 'variable'});
            expect(promise instanceof Promise).toBe(true);
            expect(mockRelay.forceFetch).toBeCalledWith({my: 'variable'}, jasmine.any(Function));
            mockRelay.forceFetch.mock.calls[0][1]({ready: true});
            return promise;
        });

        it('should handle errors', () => {
            const mockRelay = {forceFetch: jest.fn()};
            const wrapper = shallow(<WithHelpers relay={mockRelay} />);
            const promise = wrapper.props().forceFetch({my: 'variable'});
            mockRelay.forceFetch.mock.calls[0][1]({error: new Error()});
            return new Promise(resolve => {
                promise.then(() => {}, () => {
                    resolve();
                });
            });
        });

        it('should handle aborts', () => {
            const mockRelay = {forceFetch: jest.fn()};
            const wrapper = shallow(<WithHelpers relay={mockRelay} />);
            const promise = wrapper.props().forceFetch({my: 'variable'});
            mockRelay.forceFetch.mock.calls[0][1]({aborted: true});
            return new Promise(resolve => {
                promise.then(() => {}, () => {
                    resolve();
                });
            });
        });
    });
});
