/* @flow */
import Relay from 'react-relay';
import type {WrappedComponent} from '../../utils';
import type {RelayContainerSpec} from 'react-relay/lib/RelayContainer';


export default <P>(config: RelayContainerSpec) => (Component: WrappedComponent<P>) => Relay.createContainer(Component, config);
