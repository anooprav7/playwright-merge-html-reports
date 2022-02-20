// https://github.com/gildas-lormeau/zip.js

// const fs = require('fs');
import * as fs from 'fs';
// const path = require('path');
// const yauzl = require("yauzl");
// const zlib = require('zlib');
// const { ZipReader } = require('@zip.js/zip.js/lib/core/zip-reader')
// import { ZipReader, Data64URIReader } from '@zip.js/zip.js/index-fflate';
import * as zip from "@zip.js/zip.js/dist/zip-es5";
// const { Data64URIReader, ZipReader } = require('@zip.js/zip.js/index')

console.log('hi')

const startSubStr = `window.playwrightReportBase64 = "`;
const endSubStr = `";</script>`;


const htmlFilePath = "./html_report-0/index.html";

const fileContents = fs.readFileSync(htmlFilePath, 'utf8');
const startIdx = fileContents.indexOf(startSubStr);
const endIdx = fileContents.indexOf(endSubStr);

const base64Str = fileContents.substring(startIdx + startSubStr.length, endIdx);

console.log(base64Str)

// const zipReader = new zipjs.ZipReader(new zipjs.Data64URIReader(window.playwrightReportBase64), { useWebWorkers: false });
// const zipReader = new zip.ZipReader(new zip.Data64URIReader(base64Str), { useWebWorkers: false });

// const buf = Buffer.from(base64Str, 'base64').toString('ascii');
// const buf = Buffer.from(base64Str, 'base64');

// console.log(buf)

// const jsonStr = zlib.gunzipSync( buf )

// const readerOutput = new Data64URIReader(base64Str);

// console.log(readerOutput)

// const inflated = zlib.inflateRawSync(Buffer.from(base64Str, 'base64')).toString()
// const inflated = zlib.inflateSync(buf)

// console.log(buf)



// window.playwrightReportBase64 = "

// ";</script>

// const zipReader = new zipjs.ZipReader(new zipjs.Data64URIReader(window.playwrightReportBase64), { useWebWorkers: false });
// for (const entry of await zipReader.getEntries())
//   this._entries.set(entry.filename, entry);
// this._json = await this.entry('report.json');