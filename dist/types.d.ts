import { JSZipObject } from "jszip";
export declare type Location = {
    file: string;
    line: number;
    column: number;
};
export declare type TestFileSummary = {
    fileId: string;
    fileName: string;
    tests: TestCaseSummary[];
    stats: Stats;
};
export declare type TestCaseSummary = {
    testId: string;
    title: string;
    path: string[];
    projectName: string;
    location: Location;
    annotations: {
        type: string;
        description?: string;
    }[];
    outcome: 'skipped' | 'expected' | 'unexpected' | 'flaky';
    duration: number;
    ok: boolean;
};
export declare type Stats = {
    total: number;
    expected: number;
    unexpected: number;
    flaky: number;
    skipped: number;
    ok: boolean;
    duration: number;
};
export declare type HTMLReport = {
    files: TestFileSummary[];
    stats: Stats;
    projectNames: string[];
};
export declare type Config = {
    outputFolderName?: string;
    outputBasePath?: string;
};
export declare type ZipDataFile = {
    relativePath: string;
    file: JSZipObject;
};
