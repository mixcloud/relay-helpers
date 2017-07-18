/* @flow */

type RequestObjectOpts = {
    id: string,
    _xhr: XMLHttpRequest,
    removeSelf: () => void
};

type ProgressCallback = (loaded?: number, total?: number) => void;

class RequestObject {
    id: string;
    _xhr: XMLHttpRequest;
    removeSelf: () => void;

    constructor(opts: RequestObjectOpts) {
        Object.assign(this, opts);
    }

    abort() {
        this._xhr.abort();
        this.removeSelf();
    }

    onProgress(cb: ProgressCallback) {
        this._xhr.addEventListener("progress", (event: any) => {
            event = (event: ProgressEvent); // TODO: Fix in later version of Flow
            if (!event.lengthComputable || !(event.total > 0) || this._xhr.readyState >= 4) {
                return;  // TODO: Check this is working
            }
            const {loaded, total} = event;
            cb(loaded, total);
        }, false);
    }
}

export default RequestObject;
