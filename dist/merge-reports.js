"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeHTMLReports = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const jszip_1 = __importDefault(require("jszip"));
const yazl_1 = __importDefault(require("yazl"));
const Base64Encoder_1 = __importDefault(require("./Base64Encoder"));
const SHOW_DEBUG_MESSAGES = false;
const defaultConfig = {
    outputFolderName: "merged-html-report",
    outputBasePath: process.cwd()
};
async function mergeHTMLReports(inputReportPaths, givenConfig = {}) {
    if (!Array.isArray(inputReportPaths) || inputReportPaths.length < 1) {
        console.log("No Input paths provided");
        process.exit(1);
    }
    const { outputFolderName, outputBasePath } = { ...defaultConfig, ...givenConfig };
    const b64StartSearchStr = `window.playwrightReportBase64 = "data:application/zip;base64,`;
    const b64EndSearchStr = `";</script>`;
    const outputPath = path_1.default.resolve(outputBasePath, `./${outputFolderName}`);
    await (0, promises_1.mkdir)(outputPath + "/trace", { recursive: true });
    await (0, promises_1.mkdir)(outputPath + "/data", { recursive: true });
    let mergedZipContent = new yazl_1.default.ZipFile();
    let aggregateReportJson = null;
    for (let reportDir of inputReportPaths) {
        console.log(`Processing "${reportDir}"`);
        const indexHTMLContent = await (0, promises_1.readFile)(reportDir + "/index.html", "utf8");
        const startIdx = indexHTMLContent.indexOf(b64StartSearchStr);
        const endIdx = indexHTMLContent.indexOf(b64EndSearchStr);
        const base64Str = indexHTMLContent.substring(startIdx + b64StartSearchStr.length, endIdx);
        const zipData = Buffer.from(base64Str, "base64").toString("binary");
        const zipFile = await jszip_1.default.loadAsync(zipData);
        const zipDataFiles = [];
        zipFile.forEach((relativePath, file) => {
            zipDataFiles.push({ relativePath, file });
        });
        await Promise.all(zipDataFiles.map(async ({ relativePath, file }) => {
            const fileContentString = await file.async("string");
            if (relativePath !== "report.json") {
                mergedZipContent.addBuffer(Buffer.from(fileContentString), relativePath);
            }
            else {
                const currentReportJson = JSON.parse(fileContentString);
                if (SHOW_DEBUG_MESSAGES) {
                    console.log(JSON.stringify(currentReportJson, null, 2));
                }
                if (!aggregateReportJson)
                    aggregateReportJson = currentReportJson;
                else {
                    aggregateReportJson.files.push(...currentReportJson.files);
                    Object.keys(aggregateReportJson.stats).forEach((key) => {
                        aggregateReportJson.stats[key] += currentReportJson.stats[key];
                    });
                    aggregateReportJson.projectNames = [
                        ...new Set([
                            ...aggregateReportJson.projectNames,
                            ...currentReportJson.projectNames
                        ])
                    ];
                }
            }
        }));
        const contentFolderName = "data";
        const contentFolderPath = `${reportDir}/${contentFolderName}/`;
        const contentFiles = await (0, promises_1.readdir)(contentFolderPath);
        await Promise.all(contentFiles.map(async (fileName) => {
            const srcPath = path_1.default.resolve(process.cwd(), `${contentFolderPath}${fileName}`);
            const destPath = `${outputPath}/${contentFolderName}/${fileName}`;
            if (SHOW_DEBUG_MESSAGES) {
                console.log({
                    srcPath,
                    destPath
                });
            }
            await (0, promises_1.copyFile)(srcPath, destPath);
            if (SHOW_DEBUG_MESSAGES) {
                console.log(fileName);
            }
        }));
        if (SHOW_DEBUG_MESSAGES) {
            console.log({
                reportDir
            });
        }
    }
    mergedZipContent.addBuffer(Buffer.from(JSON.stringify(aggregateReportJson)), "report.json");
    if (SHOW_DEBUG_MESSAGES) {
        console.log(JSON.stringify(aggregateReportJson, null, 2));
    }
    const appFolder = path_1.default.join(require.resolve("@playwright/test"), "..", "node_modules", "playwright-core", "lib", "webpack", "htmlReport");
    await (0, promises_1.copyFile)(path_1.default.join(appFolder, "index.html"), path_1.default.join(outputPath, "index.html"));
    const indexFile = path_1.default.join(outputPath, "index.html");
    await (0, promises_1.appendFile)(indexFile, '<script>\nwindow.playwrightReportBase64 = "data:application/zip;base64,');
    await new Promise((f) => {
        mergedZipContent.end(undefined, () => {
            mergedZipContent.outputStream
                .pipe(new Base64Encoder_1.default())
                .pipe((0, fs_1.createWriteStream)(indexFile, { flags: "a" }))
                .on("close", f);
        });
    });
    await (0, promises_1.appendFile)(indexFile, '";</script>');
    const traceViewerFolder = path_1.default.join(require.resolve("@playwright/test"), "..", "node_modules", "playwright-core", "lib", "webpack", "traceViewer");
    const traceViewerTargetFolder = path_1.default.join(outputPath, "trace");
    await (0, promises_1.mkdir)(traceViewerTargetFolder, { recursive: true });
    for (const file of await (0, promises_1.readdir)(traceViewerFolder)) {
        if (file.endsWith(".map"))
            continue;
        await (0, promises_1.copyFile)(path_1.default.join(traceViewerFolder, file), path_1.default.join(traceViewerTargetFolder, file));
    }
    console.log("Merged successfully");
}
exports.mergeHTMLReports = mergeHTMLReports;
//# sourceMappingURL=merge-reports.js.map