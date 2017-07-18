/* @flow */
import Relay from 'react-relay/classic';
import RequestObject from './requestObject';

export type ClientNetworkLayerOpts = {
    graphqlUrl?: ?string,
    headers?: ?Headers,
    credentials?: ?string,
    env: Relay.Environment
};

export type RequestPromiseCallback = (xhr: XMLHttpRequest, resolve: (any) => void, reject: (any) => void) => boolean;
export type RequestCallback = (data: Object, request: any, requestType: string) => any;


const getUniqueRequestID = (request) => request.getID
    ? request.getID()
    : request.getVariables().input_0.clientMutationId;

export default class ClientNetworkLayer {
    url = '/graphql';
    headers = {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
    };
    credentials = 'same-origin';
    env: Relay.Environment;
    _onLoad: RequestCallback;
    _onLoadImmediate: RequestPromiseCallback;
    _onError: RequestPromiseCallback;

    supports() {}

    sendQueries(queryRequests: any) {
        return Promise.all(queryRequests.map(this.sendQuery));
    }

    sendQuery = (queryRequest: any) => {
        return this._send(queryRequest.getID(), 'query', queryRequest);
    };

    sendMutation(mutationRequest: any) {
        const id = getUniqueRequestID(mutationRequest);
        return this._send(id, 'mutation', mutationRequest);
    }

    // We store the XHR as a RequestObject so that it can be retrieved and manipulated later
    _storeRequest = (xhr: XMLHttpRequest, id: string) => {
        const removeSelf = () => {
            this.env._requests.delete(id);
        };

        const endOfLifeEvents = ['error', 'abort', 'loadend', 'timeout'];
        endOfLifeEvents.forEach(event => {
            xhr.addEventListener(event, removeSelf);
        });

        const requestObj = new RequestObject({
            id,
            _xhr: xhr,
            removeSelf
        });
        this.env._requests.set(id, requestObj);
    };

    // These methods allow you to handle the promise rejection in your subclass
    // while also allowing access to the underlying xhr
    _onLoadImmediate = () => false;
    _onError = () => false;

    _onLoad = () => {};
    _getHeaders = () => this.headers;

    _send = (id: string, requestType: string, request: any) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('POST', this.url, true);
            xhr.responseType = 'json';
            if (this.credentials) {
                xhr.withCredentials = true;
            }

            xhr.addEventListener("load", () => {
                const bailOnLoadImmediate = this._onLoadImmediate(xhr, resolve, reject);
                if (bailOnLoadImmediate) {
                    return;
                }

                if (xhr.status >= 400) {
                    reject(new Error("Request failed"));
                    return;
                }

                if (!xhr.response) {
                    reject(new Error("Invalid JSON response returned from server"));
                }

                const {data} = xhr.response;
                if ('errors' in xhr.response || !data) {
                    const bailOnError = this._onError(xhr, resolve, reject);
                    if (bailOnError) {
                        return;
                    }

                    const error = new Error(JSON.stringify(xhr.response.errors));
                    reject(error);
                } else {
                    resolve(data);
                }
            });

            xhr.addEventListener("error", () => {
                reject(new TypeError('Network request failed'));
            });

            const headers = this._getHeaders();
            const files = request.getFiles && request.getFiles();

            var body;
            if (files) {
                var form = new FormData();
                form.append('id', id);
                form.append('query', request.getQueryString());
                form.append('variables', JSON.stringify(request.getVariables()));
                Object.keys(files).forEach(filename => {
                    if (Array.isArray(files[filename])) {
                        files[filename].forEach(file => {
                            form.append(filename, file);
                        });
                    } else {
                        form.append(filename, files[filename]);
                    }
                });
                body = form;
                delete headers['Content-Type'];
            } else {
                body = JSON.stringify({
                    id,
                    query: request.getQueryString(),
                    variables: request.getVariables()
                });
            }

            Object.keys(headers).forEach(name => {
                xhr.setRequestHeader(name, headers[name]);
            });

            const xhrId = getUniqueRequestID(request);
            this._storeRequest(xhr, xhrId);

            xhr.send(body);
        }).then(data => {
            request.resolve({response: data});
            this._onLoad(data, request, requestType);
        }).catch(err => {
            request.reject(err);
        });
    }
}
