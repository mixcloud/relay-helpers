/* @flow */

type RequestObjectOpts = {
    id: string,
    _xhr: XMLHttpRequest,
    removeSelf: () => void
};

export type ProgressCallback = (loaded: number, total: number) => void;

class RequestObject {
    id: string;
    _xhr: XMLHttpRequest;
    removeSelf: () => void;
    uploadProgressCallback: ?ProgressCallback;

    constructor(opts: RequestObjectOpts) {
        Object.assign(this, opts);
        if (this._xhr.upload) {
            this._xhr.upload.addEventListener("progress", this.handleUploadProgress, false);
        }
    }

    abort() {
        this._xhr.abort();
        this.removeSelf();
    }

    handleUploadProgress = (event: any) => {
        event = (event: ProgressEvent); // TODO: Fix in later version of Flow
        if (!event.lengthComputable || !(event.total > 0) || this._xhr.readyState >= 4) {
            return;
        }

        const {loaded, total} = event;

        if (this.uploadProgressCallback) {
            this.uploadProgressCallback(loaded, total);
        }
    };

    onUploadProgress(cb: ProgressCallback) {
        this.uploadProgressCallback = cb;
    }
}

export default RequestObject;
