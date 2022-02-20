// https://github.com/gildas-lormeau/zip.js
// https://gildas-lormeau.github.io/zip.js/core-api.html
// https://github.com/daraosn/node-zip - Binary encoding

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const yauzl = require("yauzl");
const yazl = require("yazl");
const stream = require("stream");
const fse = require("fs-extra");

class Base64Encoder extends stream.Transform {
  constructor(...args) {
    super(...args);
    this._remainder = void 0;
  }

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

    chunk = chunk.toString("base64");
    this.push(Buffer.from(chunk));
    callback();
  }

  _flush(callback) {
    if (this._remainder)
      this.push(Buffer.from(this._remainder.toString("base64")));
    callback();
  }
}

const startSubStr = `window.playwrightReportBase64 = "data:application/zip;base64,`;
const endSubStr = `";</script>`;

const reportFolder = path.resolve(process.cwd(), "./html-report-final");
fs.mkdirSync(reportFolder, { recursive: true });

const finalDataZipFile = new yazl.ZipFile();

let finalReportJson = null;

async function generateFinalReport() {
  const indexDirectoryPaths = ["./html_report-0", "./html_report-1"];

  for (let htmlFileDir of indexDirectoryPaths) {
    const fileContents = fs.readFileSync(htmlFileDir + "/index.html", "utf8");
    const startIdx = fileContents.indexOf(startSubStr);
    const endIdx = fileContents.indexOf(endSubStr);

    const base64Str = fileContents.substring(
      startIdx + startSubStr.length,
      endIdx
    );

    const zipDataBuffer = Buffer.from(base64Str, "base64");
    const decodedFromBase64 = zipDataBuffer.toString("binary");

    await addReportContents(decodedFromBase64);

    const sourceDataPath = htmlFileDir+ "/data/";

    fs.readdirSync(sourceDataPath).map(fileName => {
      fs.copyFile(`${sourceDataPath}${fileName}`, `${reportFolder}/data/${fileName}`, (err) => {
        if (err) throw err;
        console.log('source.txt was copied to destination.txt');
      });
      console.log(fileName)
    })
  }

  finalDataZipFile.addBuffer(
    Buffer.from(JSON.stringify(finalReportJson)),
    "report.json"
  );

  const appFolder = path.join(
    require.resolve("playwright-core"),
    "..",
    "lib",
    "webpack",
    "htmlReport"
  );
  fs.copyFileSync(
    path.join(appFolder, "index.html"),
    path.join(reportFolder, "index.html")
  );

  const indexFile = path.join(reportFolder, "index.html");
  fs.appendFileSync(
    indexFile,
    '<script>\nwindow.playwrightReportBase64 = "data:application/zip;base64,'
  );
  await new Promise((f) => {
    finalDataZipFile.end(undefined, () => {
      finalDataZipFile.outputStream
        .pipe(new Base64Encoder())
        .pipe(fs.createWriteStream(indexFile, { flags: "a" }))
        .on("close", f);
    });
  });

  fs.appendFileSync(indexFile, '";</script>');

}

async function generateFileContentMap(zip) {
  return new Promise((res) => {
    const result = {};
    let count = 0;
    zip.forEach(async (relativePath, file) => {
      count++;
      const zipFile = zip.file(relativePath);
      result[relativePath] = await zipFile.async("string");
      if (relativePath !== "report.json") {
        finalDataZipFile.addBuffer(
          Buffer.from(result[relativePath]),
          relativePath
        );
      }
      count--;
      if (count === 0) {
        res(result);
      }
    });
  });
}

function combineResultJsons(currentReportJson) {
  if (!finalReportJson) return currentReportJson;

  finalReportJson.files.push(...currentReportJson.files);

  Object.keys(finalReportJson.stats).forEach((key) => {
    finalReportJson.stats[key] += currentReportJson.stats[key];
  });
  return finalReportJson;
}

async function addReportContents(base64Text) {
  try {
    const zip = await JSZip.loadAsync(base64Text);
    const result = await generateFileContentMap(zip);
    const currentReportJson = JSON.parse(result["report.json"]);
    finalReportJson = combineResultJsons(currentReportJson);

    console.log({
      finalReportJson
    });
  } catch (err) {
    console.log({
      err
    });
  }
}

generateFinalReport();
