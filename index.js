"use strict";

const Transform = require("stream").Transform;
const util = require("util");

const mmm = require("mmmagic");
const Magic = require("mmmagic").Magic;

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
function MomeWrath(listener) {
    // return new instance when invoked as function
    if (!(this instanceof MomeWrath)) {
        return new MomeWrath(listener);
    }
    // super()
    Transform.call(this);

    this.type = null;

    this._chunkBuffer = {
        chunks: [],
        length: 0,
    };
    this._typeEmitted = false;

    // bind listener
    if (typeof listener === "function") {
        this.on("type", listener);
    }
}

util.inherits(MomeWrath, Transform);

MomeWrath.prototype._transform = function (chunk, encoding, cb) {
    // do not emit twice
    if (this._typeEmitted) {
        return cb(null, chunk);
    }

    this._chunkBuffer.chunks.push(chunk);
    this._chunkBuffer.length += chunk.length;

    // try to detect
    const magic = new Magic(mmm.MAGIC_MIME);
    magic.detect(Buffer.concat(this._chunkBuffer.chunks), (err, detection) => {
        if (err) {
            // return cb(err);
        }

        // if type known or limit exceeded, emit
        // (file-type guarantees that it needs at most 4100 bytes)
        if (this._typeEmitted) { return; }
        if (detection || this._chunkBuffer.length >= 16384) {
            this.type = detection ? splitMime(detection) : null;
            this.emit("type", this.type);
            this._typeEmitted = true;
        }

        cb(null, chunk);
    });
    // cb(null, chunk);
};

MomeWrath.prototype._flush = function (cb) {
    // emit null if there was no detection at all
    if (!this._typeEmitted) {
        this.type = null;
        this.emit("type", this.type);
        this._typeEmitted = true;
    }

    cb();
};

const _splitMime = /^(.*); charset=(.*)$/;
function splitMime(s) {
    const p = s.match(_splitMime);
    return {
        mime: p[1],
        encoding: p[2],
    };
}

module.exports = MomeWrath;
