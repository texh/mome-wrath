"use strict";

const expect = require("chai").expect;
const PassThrough = require("stream").PassThrough;
const fs = require("fs");
const path = require("path");

const MimeStream = require("../index.js");

describe("MimeStream", function () {

    it("should construct when invoked as a function", function () {
        expect(MimeStream()).to.be.instanceof(MimeStream);
    });

    it("should pass through all chunks unmodified", function () {
        const obj = new MimeStream();

        const source = new PassThrough();
        const target = new PassThrough();

        source.pipe(obj).pipe(target);

        source.write("hello ", "utf8");
        source.write("world", "utf8");
        source.end("!", "utf8");

        const expected = Buffer.from("hello world!", "utf8");
        expect(target.read()).to.satisfy((bytes) => bytes.equals(expected));
    });

    it("should emit 'type' with null when closed too early", function (done) {
        const obj = new MimeStream();

        obj.on("type", function (type) {
            expect(type).to.be.null;
            done();
        });

        const data = new PassThrough();
        data.pipe(obj);

        data.end(Buffer.alloc(0));
    });

    /*
    Actually emits: { mime: 'application/octet-stream', encoding: 'binary' }
    it("should emit 'type' with null when type unknown", function (done) {
        const obj = new MimeStream();

        obj.on("type", function (type) {
            expect(type).to.be.null;
            done();
        });

        const data = new PassThrough();
        data.pipe(obj);

        data.end(Buffer.alloc(10 * 1024));
    });
    */

    it("should detect binary types", function (done) {
        const obj = new MimeStream();

        obj.on("type", function (type) {
            expect(type).to.to.deep.equal({ mime: "image/png", encoding: "binary" });
            done();
        });

        const data = fs.createReadStream(path.join(__dirname, "png.png"));
        data.pipe(obj);
    });

    it("should emit 'type' only once", function (done) {
        const obj = new MimeStream();

        obj.on("type", function (type) {
            expect(type).to.to.deep.equal({ mime: "application/octet-stream", encoding: "binary" });
            done();
        });

        const data = fs.createReadStream(path.join(__dirname, "png.png"), {
            // pass each byte separately so that there is plenty of opportunity
            // for type detection
            highWaterMark: 1,
        });
        data.pipe(obj);
    });

    it("should set 'type' property after detection", function (done) {
        const obj = new MimeStream();

        obj.on("type", function () {
            expect(obj.type).to.to.deep.equal({ mime: "image/png", encoding: "binary" });
            done();
        });

        const data = fs.createReadStream(path.join(__dirname, "png.png"));
        data.pipe(obj);
    });

    it("should bind the listener argument", function (done) {
        const data = fs.createReadStream(path.join(__dirname, "png.png"));
        data.pipe(new MimeStream(function (type) {
            expect(type).to.to.deep.equal({ mime: "image/png", encoding: "binary" });
            done();
        }));
    });

});
