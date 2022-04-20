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
const re = /<script>\nwindow\.playwrightReportBase64\s=\s"data:application\/zip;base64,(.+)<\/script>/;
async function mergeHTMLReports(inputReportPaths, givenConfig = {}) {
    if (!Array.isArray(inputReportPaths) || inputReportPaths.length < 1) {
        console.log("No Input paths provided");
        process.exit(1);
    }
    const { outputFolderName, outputBasePath } = { ...defaultConfig, ...givenConfig };
    const outputPath = path_1.default.resolve(outputBasePath, `./${outputFolderName}`);
    let mergedZipContent = new yazl_1.default.ZipFile();
    let aggregateReportJson = null;
    let baseIndexHtml = '';
    const fileReportMap = new Map();
    for (let reportDir of inputReportPaths) {
        console.log(`Processing "${reportDir}"`);
        const indexHTMLContent = await (0, promises_1.readFile)(reportDir + "/index.html", "utf8");
        const [, base64Str] = re.exec(indexHTMLContent) ?? [];
        if (!base64Str)
            throw new Error('index.html does not contain report data');
        if (!baseIndexHtml) {
            baseIndexHtml = indexHTMLContent.replace(re, '');
        }
        const zipData = Buffer.from(base64Str, "base64").toString("binary");
        const zipFile = await jszip_1.default.loadAsync(zipData);
        const zipDataFiles = [];
        zipFile.forEach((relativePath, file) => {
            zipDataFiles.push({ relativePath, file });
        });
        await Promise.all(zipDataFiles.map(async ({ relativePath, file }) => {
            const fileContentString = await file.async("string");
            if (relativePath !== "report.json") {
                const fileReportJson = JSON.parse(fileContentString);
                if (fileReportMap.has(relativePath)) {
                    if (SHOW_DEBUG_MESSAGES) {
                        console.log('Merging duplicate file report: ' + relativePath);
                    }
                    const existingReport = fileReportMap.get(relativePath);
                    if (existingReport?.fileId !== fileReportJson.fileId)
                        throw new Error('Error: collision with file ids in two file reports');
                    existingReport.tests.push(...fileReportJson.tests);
                }
                else {
                    fileReportMap.set(relativePath, fileReportJson);
                }
            }
            else {
                const currentReportJson = JSON.parse(fileContentString);
                if (SHOW_DEBUG_MESSAGES) {
                    console.log('---------- report.json ----------');
                    console.log(JSON.stringify(currentReportJson, null, 2));
                }
                if (!aggregateReportJson)
                    aggregateReportJson = currentReportJson;
                else {
                    currentReportJson.files.forEach((file) => {
                        const existingGroup = aggregateReportJson?.files.find(({ fileId }) => fileId === file.fileId);
                        if (existingGroup) {
                            existingGroup.tests.push(...file.tests);
                            mergeStats(existingGroup.stats, file.stats);
                        }
                        else {
                            aggregateReportJson?.files.push(file);
                        }
                    });
                    mergeStats(aggregateReportJson.stats, currentReportJson.stats);
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
        if ((0, fs_1.existsSync)(contentFolderPath)) {
            await (0, promises_1.mkdir)(outputPath + "/data", { recursive: true });
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
        }
        if (SHOW_DEBUG_MESSAGES) {
            console.log({
                reportDir
            });
        }
    }
    if (!baseIndexHtml)
        throw new Error('Base report index.html not found');
    fileReportMap.forEach((fileReport, relativePath) => {
        mergedZipContent.addBuffer(Buffer.from(JSON.stringify(fileReport)), relativePath);
    });
    mergedZipContent.addBuffer(Buffer.from(JSON.stringify(aggregateReportJson)), "report.json");
    if (SHOW_DEBUG_MESSAGES) {
        console.log('---------- aggregateReportJson ----------');
        console.log(JSON.stringify(aggregateReportJson, null, 2));
    }
    const indexFilePath = path_1.default.join(outputPath, "index.html");
    await (0, promises_1.writeFile)(indexFilePath, baseIndexHtml + `<script>
window.playwrightReportBase64 = "data:application/zip;base64,`);
    await new Promise((f) => {
        mergedZipContent.end(undefined, () => {
            mergedZipContent.outputStream
                .pipe(new Base64Encoder_1.default())
                .pipe((0, fs_1.createWriteStream)(indexFilePath, { flags: "a" }))
                .on("close", f);
        });
    });
    await (0, promises_1.appendFile)(indexFilePath, '";</script>');
    console.log(`Successfully merged ${inputReportPaths.length} report${inputReportPaths.length === 1 ? '' : 's'}`);
}
exports.mergeHTMLReports = mergeHTMLReports;
function mergeStats(base, added) {
    base.total += added.total;
    base.expected += added.expected;
    base.unexpected += added.unexpected;
    base.flaky += added.flaky;
    base.skipped += added.skipped;
    base.duration += added.duration;
    base.ok = base.ok && added.ok;
}
//# sourceMappingURL=merge-reports.js.map