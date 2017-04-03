/* @flow */
import Relay from 'react-relay';
import withRelayRenderer from './withRelayRenderer';
import withRelayHelpersDecorator from './withRelayHelpers';
import createRelayContainer from './createRelayContainer';
import {splitQuery} from '../../utils';
import type {WrappedComponent} from '../../utils';


type Options<P> = {|
    name?: string,
    params?: (
        {[paramName: string]: {required: boolean}}
      | (props: P) => {[paramName: string]: any}
    ),
    query: Relay.QL | Relay.QL[],
    initialVariables?: Object,
    forceFetch?: boolean,
    ttl?: number,
    withHelpers?: boolean,
    isomorphic?: boolean
|};


export default <P: Object>(
    {
        name,
        params,
        query,
        initialVariables,
        forceFetch,
        ttl,
        isomorphic,
        withHelpers = false
    }: Options<P>
) => (Component: WrappedComponent<P>): ReactClass<P> => {
    // Grab the name from the component if it is not passed in manually
    const componentName = Component.displayName || Component.name || ((Component.constructor: any).name: any);
    name = name || componentName;

    // Remove reserved characters
    name = name.replace(/\W/g, '');

    // Split out queries and fragments from query
    const queries = {};
    const fragments = {};
    (Array.isArray(query) ? query : [query]).forEach(query => {
        const {routeQuery, fragment} = splitQuery(query, name);
        queries[routeQuery.fieldName] = () => routeQuery;
        fragments[routeQuery.fieldName] = () => fragment;
    });

    // Create a Relay container
    var Container = Component;
    if (withHelpers) {
        Container = withRelayHelpersDecorator()(Container);
    }
    Container = createRelayContainer({fragments, initialVariables})(Container);

    // Prepare the query config
    var queryConfig;
    if (typeof params === 'function') {
        const queryConfigName = name;
        const paramsCallback = params;
        queryConfig = (props: P) => ({
            name: queryConfigName,
            queries,
            params: paramsCallback(props)
        });
    } else {
        queryConfig = {
            name,
            queries,
            params: params || {}
        };
    }

    return withRelayRenderer({
        forceFetch,
        ttl,
        isomorphic,
        queryConfig
    })(Container);
};
