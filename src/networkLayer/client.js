/* @flow */
import Relay from 'react-relay/classic';

export type ClientNetworkLayerOpts = {
    graphqlUrl?: ?string,
    headers?: ?Headers,
    credentials?: ?string,
    csrf?: ?boolean,
    on403callback?: ?() => void,
    onSpeedbarResponse?: ?(response: any) => void,
    onJailedCallback?: ?() => void,
    onMutationStartCallback?: ?(id: number, data?: Object) => void,
    onMutationProgressCallback?: ?(id: number, received: number, size: number) => void,
    env: Relay.Environment
};

var nextRequestId = 0;
var nextTraceId = 0;

function addTraceIds(trace) {
    const keys = Object.keys(trace).filter(key => key !== '__trace');
    if (trace.__trace) {
        trace.__clientTraceId = nextTraceId++;
    }
    if (keys.length) {
        keys.forEach(key => {
            addTraceIds(trace[key]);
        });
    }
    return trace;
}

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
    csrf = true;
    on403callback = null;
    onSpeedbarResponse = null;
    onJailedCallback = null;
    env: Relay.Environment;

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

    _send = (id: string, requestType: string, request: any) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('POST', this.url, true);
            xhr.responseType = 'json';
            if (this.credentials) {
                xhr.withCredentials = true;
            }

            xhr.addEventListener("progress", (event: ProgressEvent) => {
                console.log(event)
                if (!event.lengthComputable || !(event.total > 0) || xhr.readyState >= 4) {
                    return;
                }

                const {loaded, total} = event;
                console.log('progress', loaded, total); // TODO: Work out why this isn't working
            }, false);

            xhr.addEventListener("load", () => {
                if (xhr.status === 403 && this.on403callback) {
                    this.on403callback();
                    reject(new Error("Request failed"));
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
                    const error = new Error(JSON.stringify(xhr.response.errors));
                    reject(error);

                    if (this.onJailedCallback) {
                        for (const err of xhr.response.errors) {
                            if (err && err.message === 'jailed') {
                                this.onJailedCallback();
                                break;
                            }
                        }
                    }
                } else {
                    resolve(data);
                }
            });

            xhr.addEventListener("error", () => {
                reject(new TypeError('Network request failed'));
            });

            xhr.addEventListener("abort", () => {
                // TODO: Remove request from xhrs on abort, success and error
            });

            const headers = this.csrf ? {...this.headers, 'X-CSRFToken': getCsrfCookie()} : {...this.headers};

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

            xhr.send(body);

            const xhrId = getUniqueRequestID(request);
            if (this.env) {
                this.env._xhrRequests.set(xhrId, {
                    abort: () => {
                        console.log('ABORTED');
                    },
                    onProgress: () => {}
                });
            }
        }).then(data => {
            request.resolve({response: data});

            if (this.onSpeedbarResponse) {
                const onSpeedbarResponse = this.onSpeedbarResponse; // For flow

                const name = (request.getQuery)
                        ? request.getQuery().getName()
                        : (request.getMutation)
                        ? request.getMutation().getName()
                        : 'Unknown';

                if (data && data.__speedbar) {
                    onSpeedbarResponse({
                        requestId: `r${nextRequestId++}`, // TODO: relayReqId doesn't seem to be unique...req.relayReqId,
                        name,
                        speedbar: data.__speedbar,
                        trace: addTraceIds(data.__trace),
                        query: request.getQueryString(),
                        variables: request.getVariables(),
                        response: data,
                        type: requestType
                    });
                }
            }
        }).catch(err => {
            request.reject(err);
        });
    }
}


const CSRF_COOKIE_RE = /(?:^|;)\s*csrftoken=([^;\s]*)/;

function getCsrfCookie(): ?string {
    var result = CSRF_COOKIE_RE.exec(document.cookie);
    return result ? result[1] : null;
}
