/// <reference types="node" />
import { Transform, TransformCallback } from 'stream';
declare class Base64Encoder extends Transform {
    private _remainder;
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void;
    _flush(callback: TransformCallback): void;
}
export default Base64Encoder;
