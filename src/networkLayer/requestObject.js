/* @flow */

type RequestObjectOpts = {
    id: string,
    _xhr: XMLHttpRequest,
    removeSelf: () => void
};

type ProgressCallback = (loaded?: number, total?: number) => void;

const cbTypes = {
    DOWNLOAD: 1,
    UPLOAD: 2
};

class RequestObject {
    id: string;
    _xhr: XMLHttpRequest;
    removeSelf: () => void;
    downloadProgressCallback: ProgressCallback = () => {};
    uploadProgressCallback: ProgressCallback = () => {};

    constructor(opts: RequestObjectOpts) {
        Object.assign(this, opts);
        this._xhr.addEventListener("progress", this.handleProgress(cbTypes.DOWNLOAD), false);
        if (this._xhr.upload) {
            this._xhr.upload.addEventListener("progress", this.handleProgress(cbTypes.UPLOAD), false);
        }
    }

    abort() {
        this._xhr.abort();
        this.removeSelf();
    }

    handleProgress = (cbType: 1 | 2) => {
        const handler = (event: any) => {
            event = (event: ProgressEvent); // TODO: Fix in later version of Flow
            if (!event.lengthComputable || !(event.total > 0) || this._xhr.readyState >= 4) {
                return;
            }

            const {loaded, total} = event;

            if (cbType === cbTypes.DOWNLOAD) {
                this.downloadProgressCallback(loaded, total);
            } else if (cbType === cbTypes.UPLOAD) {
                this.uploadProgressCallback(loaded, total);
            }
        };
        return handler.bind(this);
    };

    onProgress(cb: ProgressCallback) {
        this.downloadProgressCallback = cb;
    }

    onUploadProgress(cb: ProgressCallback) {
        this.uploadProgressCallback = cb;
    }
}

export default RequestObject;
