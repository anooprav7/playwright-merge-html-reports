"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
class Base64Encoder extends stream_1.Transform {
    _transform(chunk, encoding, callback) {
        if (this._remainder) {
            chunk = Buffer.concat([this._remainder, chunk]);
            this._remainder = undefined;
        }
        const remaining = chunk.length % 3;
        if (remaining) {
            this._remainder = chunk.slice(chunk.length - remaining);
            chunk = chunk.slice(0, chunk.length - remaining);
        }
        chunk = chunk.toString('base64');
        this.push(Buffer.from(chunk));
        callback();
    }
    _flush(callback) {
        if (this._remainder)
            this.push(Buffer.from(this._remainder.toString('base64')));
        callback();
    }
}
exports.default = Base64Encoder;
//# sourceMappingURL=Base64Encoder.js.map