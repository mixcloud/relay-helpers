/* @flow */
import Relay from 'react-relay';
import type {WrappedComponent} from '../../utils';
import type {RelayContainerSpec} from 'react-relay/lib/RelayContainer';


export default <P>(config: RelayContainerSpec) => (Component: WrappedComponent<P>) => {
    const Container = Relay.createContainer(Component, config);
    Container.WrappedComponent = Component;
    return Container;
};
