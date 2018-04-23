"use strict";

const Transform = require("stream").Transform;
const util = require("util");

const fileType = require("file-type");

/**
 * Constructs a new duplex (Transform) stream that emits a 'type' event as soon
 * as the input's MIME type is known.
 *
 * The data itself is pushed through as-is.
 *
 * The event consists of an object with the following properties:
 * - ext: the extension (e.g. 'png')
 * - mime: the mime type (e.g. 'image/png')
 *
 * When the type is unknown or could not be detected (stream closed too early),
 * null is given instead of the event object.
 */
function MimeStream(options) {
    Transform.call(this, options);

    this.type = null;

    this._chunkBuffer = {
        chunks: [],
        length: 0,
    };
    this._typeEmitted = false;
}

util.inherits(MimeStream, Transform);

MimeStream.prototype._transform = function (chunk, encoding, cb) {
    // do not emit twice
    if (this._typeEmitted) {
        return cb(null, chunk);
    }

    this._chunkBuffer.chunks.push(chunk);
    this._chunkBuffer.length += chunk.length;

    // try to detect
    const detection = fileType(Buffer.concat(this._chunkBuffer.chunks));

    // if type known or limit exceeded, emit
    // (file-type guarantees that it needs at most 4100 bytes)
    if (detection || this._chunkBuffer.length >= 4100) {
        this.type = detection;
        this.emit("type", this.type);
        this._typeEmitted = true;
    }

    cb(null, chunk);
};

MimeStream.prototype._flush = function (cb) {
    // emit null if there was no detection at all
    if (!this._typeEmitted) {
        this.type = null;
        this.emit("type", this.type);
        this._typeEmitted = true;
    }

    cb();
};

module.exports = MimeStream;
