/* @flow */

type RequestObjectOpts = {
    id: string,
    request: XMLHttpRequest,
    removeSelf: () => void
};

class RequestObject {
    id: string;
    request: XMLHttpRequest;
    removeSelf: () => void;

    constructor(opts: RequestObjectOpts) {
        Object.assign(this, opts);
    }

    abort() {
        this.request.abort();
        this.removeSelf();
    }

    onProgress(cb: Function) {
        this.request.addEventListener("progress", (event: ProgressEvent) => {
            if (!event.lengthComputable || !(event.total > 0) || this.request.readyState >= 4) {
                return;  // TODO: Check this is working
            }
            const {loaded, total} = event;
            cb(loaded, total);
        }, false);
    }
}

export default RequestObject;
