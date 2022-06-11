/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @author Anoop Raveendran
 */

import { createWriteStream } from "fs";
import { mkdir, readFile, readdir, copyFile, appendFile } from "fs/promises";
import path from "path";
import JSZip from "jszip";
import yazl from "yazl";
import Base64Encoder from "./Base64Encoder";
import type { HTMLReport, Config, ZipDataFile } from "./types";

const SHOW_DEBUG_MESSAGES = false;

const defaultConfig = {
  outputFolderName: "merged-html-report",
  outputBasePath: process.cwd()
}

async function mergeHTMLReports(inputReportPaths: string[], givenConfig: Config = {}) {
  if(!Array.isArray(inputReportPaths) || inputReportPaths.length < 1) {
    console.log("No Input paths provided")
    process.exit(1);
  }

  // Merge config with default values
  const { outputFolderName, outputBasePath } = {...defaultConfig, ...givenConfig};

  const b64StartSearchStr = `window.playwrightReportBase64 = "data:application/zip;base64,`;
  const b64EndSearchStr = `";</script>`;

  const outputPath = path.resolve(outputBasePath, `./${outputFolderName}`);

  await mkdir(outputPath + "/trace", { recursive: true });
  await mkdir(outputPath + "/data", { recursive: true });

  let mergedZipContent = new yazl.ZipFile();
  let aggregateReportJson: HTMLReport | null = null;

  for (let reportDir of inputReportPaths) {
    console.log(`Processing "${reportDir}"`)
    const indexHTMLContent = await readFile(reportDir + "/index.html", "utf8");
    const startIdx = indexHTMLContent.indexOf(b64StartSearchStr);
    const endIdx = indexHTMLContent.indexOf(b64EndSearchStr);

    const base64Str = indexHTMLContent.substring(
      startIdx + b64StartSearchStr.length,
      endIdx
    );

    const zipData = Buffer.from(base64Str, "base64").toString("binary");
    const zipFile = await JSZip.loadAsync(zipData);
    const zipDataFiles: ZipDataFile[] = [];

    zipFile.forEach((relativePath, file) => {
      zipDataFiles.push({ relativePath, file });
    })

    await Promise.all(zipDataFiles.map(async ({ relativePath, file }) => {
      const fileContentString = await file.async("string");
      if (relativePath !== "report.json") {
        mergedZipContent.addBuffer(
          Buffer.from(fileContentString),
          relativePath
        );
      } else {
        const currentReportJson = JSON.parse(fileContentString);
        if (SHOW_DEBUG_MESSAGES) {
          console.log(JSON.stringify(currentReportJson, null, 2));
        }
        if (!aggregateReportJson) aggregateReportJson = currentReportJson;
        else {
          aggregateReportJson.files.push(...currentReportJson.files);
          Object.keys(aggregateReportJson.stats).forEach((key) => {
            aggregateReportJson!.stats[key] += currentReportJson.stats[key];
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
    let contentFiles = [];
    
    try {
      await readdir(contentFolderPath);
    } catch (e) {
      // No-op
    }

    await Promise.all(
      contentFiles.map(async (fileName) => {
        const srcPath = path.resolve(
          process.cwd(),
          `${contentFolderPath}${fileName}`
        );
        const destPath = `${outputPath}/${contentFolderName}/${fileName}`;
        if (SHOW_DEBUG_MESSAGES) {
          console.log({
            srcPath,
            destPath
          });
        }
        await copyFile(srcPath, destPath);
        if (SHOW_DEBUG_MESSAGES) {
          console.log(fileName);
        }
      })
    );

    if (SHOW_DEBUG_MESSAGES) {
      console.log({
        reportDir
      });
    }
  }

  mergedZipContent.addBuffer(
    Buffer.from(JSON.stringify(aggregateReportJson)),
    "report.json"
  );

  if (SHOW_DEBUG_MESSAGES) {
    console.log(JSON.stringify(aggregateReportJson, null, 2));
  }

  const appFolder = path.join(
    path.dirname(require.resolve("playwright-core")),
    "lib",
    "webpack",
    "htmlReport"
  );
  await copyFile(
    path.join(appFolder, "index.html"),
    path.join(outputPath, "index.html")
  );

  const indexFile = path.join(outputPath, "index.html");
  await appendFile(
    indexFile,
    '<script>\nwindow.playwrightReportBase64 = "data:application/zip;base64,'
  );

  await new Promise((f) => {
    mergedZipContent.end(undefined, () => {
      mergedZipContent.outputStream
        .pipe(new Base64Encoder())
        .pipe(createWriteStream(indexFile, { flags: "a" }))
        .on("close", f);
    });
  });

  await appendFile(indexFile, '";</script>');

  const traceViewerFolder = path.join(
    path.dirname(require.resolve("playwright-core")),
    "lib",
    "webpack",
    "traceViewer"
  );
  const traceViewerTargetFolder = path.join(outputPath, "trace");
  await mkdir(traceViewerTargetFolder, { recursive: true });
  for (const file of await readdir(traceViewerFolder)) {
    if (file.endsWith(".map")) continue;
    await copyFile(
      path.join(traceViewerFolder, file),
      path.join(traceViewerTargetFolder, file)
    );
  }
  console.log("Merged successfully")
}

export {
  mergeHTMLReports
}
