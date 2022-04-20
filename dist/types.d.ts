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
export interface FileReport {
    fileId: string;
    fileName: string;
    tests: TestsEntity[];
}
export interface TestsEntity {
    testId: string;
    title: string;
    projectName: string;
    location: Location;
    duration: number;
    annotations?: unknown[];
    outcome: string;
    path?: string[];
    results?: ResultsEntity[];
    ok: boolean;
}
export interface ResultsEntity {
    duration: number;
    startTime: string;
    retry: number;
    steps?: Step[];
    errors?: string[];
    status: string;
    attachments?: AttachmentsEntity[];
}
export interface Step {
    title: string;
    startTime: string;
    duration: number;
    steps?: Step[];
    count: number;
    snippet?: string;
    location?: Location;
    error?: string;
}
export interface AttachmentsEntity {
    name: string;
    contentType: string;
    path: string;
}
