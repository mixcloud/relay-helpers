/* @flow */
import Relay from 'react-relay/classic';
import RequestObject from './requestObject';

type Headers = {[name: string]: string};

export type ClientNetworkLayerOpts = {
    graphqlUrl?: string,
    headers?: Headers,
    withCredentials?: boolean,
    env: Relay.Environment
};

const getUniqueRequestID = (request) => request.getID
    ? request.getID()
    : request.getVariables().input_0.clientMutationId;

export default class ClientNetworkLayer {
    url: string;
    headers: Headers;
    withCredentials: boolean;
    env: Relay.Environment;

    constructor({graphqlUrl = '/graphql', headers = {}, withCredentials = false, env}: ClientNetworkLayerOpts = {}) {
        this.url = graphqlUrl;
        this.env = env;
        this.withCredentials = withCredentials;
        this.headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...headers
        };
    }

    supports() {}

    sendQueries(queryRequests: any) {
        return Promise.all(queryRequests.map(this.sendQuery));
    }

    sendQuery = (queryRequest: any) => {
        return this.send(queryRequest.getID(), 'query', queryRequest);
    };

    sendMutation(mutationRequest: any) {
        const id = getUniqueRequestID(mutationRequest);
        return this.send(id, 'mutation', mutationRequest);
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
    onError(xhr: XMLHttpRequest, resolve: () => void, reject: (err: Error) => void, response: Object) {
        const error = new Error(JSON.stringify(response.errors));
        reject(error);
    }

    getHeaders() { return this.headers; }

    getUrl(id: string, requestType: string, request: any): string { return this.url; }  // eslint-disable-line no-unused-vars

    onLoad(xhr: XMLHttpRequest, resolve: () => void, reject: (any) => void) {
        if (xhr.status >= 400) {
            reject(new Error("Request failed"));
            return;
        }

        if (!xhr.response) {
            reject(new Error("Invalid JSON response returned from server"));
            return;
        }

        var response = xhr.response;
        if (typeof response === 'string') {
            try {
                response = JSON.parse(response);
            } catch (err) {
                reject(new Error("Invalid JSON response returned from server"));
                return;
            }
        }
        const {data} = response;
        if ('errors' in response || !data) {
            this.onError(xhr, resolve, reject, response);
        } else {
            resolve(data);
        }
    }

    send(id: string, requestType: string, request: any): Promise<*> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('POST', this.getUrl(id, requestType, request), true);
            xhr.responseType = 'json';
            if (this.withCredentials) {
                xhr.withCredentials = true;
            }

            xhr.addEventListener("load", () => {
                this.onLoad(xhr, resolve, reject);
            });

            xhr.addEventListener("error", () => {
                reject(new TypeError('Network request failed'));
            });

            xhr.addEventListener("abort", () => {
                reject({cancelled: true});
            });

            const headers = this.getHeaders();
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
            return data;
        }).catch(err => {
            request.reject(err);
        });
    }
}
