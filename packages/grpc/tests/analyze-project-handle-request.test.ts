/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import { afterEach, describe, it, mock } from 'node:test';
import { expect } from 'expect';
import {
  handleAnalyzeProjectRequest,
  type WorkerData,
} from '../src/analyze-project-handle-request.js';
import type { AnalyzeProjectIncrementalEvent } from '../src/analyze-project-request.js';
import { sonarjs as analyzeProjectProto } from '../src/proto/analyze-project.js';
import { FS_CACHE_INSTALLATION, installFsCache } from '../../shared/src/fs-cache/hook.js';
import { FsCacheArchive } from '../../shared/src/fs-cache/archive.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const workerData: WorkerData = { debugMemory: false };
type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
const { AnalysisMode, FileType, FilesystemCacheMode, JsTsLanguage } =
  analyzeProjectProto.analyzeproject.v1;

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION];
});

function createAnalyzeProjectRequest(): AnalyzeProjectRequest {
  return {
    configuration: {
      baseDir: '/project',
      canAccessFileSystem: false,
    },
    files: {},
    rules: [],
    cssRules: [],
    bundles: [],
  };
}

describe('analyze-project request handler', () => {
  it('runs type-aware analysis without context artifacts', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-project-no-context-'));
    const filePath = path.join(baseDir, 'orphan.ts');
    const request: AnalyzeProjectRequest = {
      configuration: { baseDir, canAccessFileSystem: true },
      files: {
        [filePath]: { fileContent: '[80, 3, 9].sort();', fileType: FileType.FILE_TYPE_MAIN },
      },
      rules: [
        {
          key: 'S2871',
          configurations: [],
          fileTypeTargets: [FileType.FILE_TYPE_MAIN],
          language: JsTsLanguage.JS_TS_LANGUAGE_TS,
          analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
        },
      ],
      cssRules: [],
      bundles: [],
    };

    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );

    expect(result).toMatchObject({
      type: 'success',
      result: {
        output: {
          files: {
            [normalizeToAbsolutePath(filePath)]: {
              issues: [expect.objectContaining({ ruleId: 'S2871' })],
            },
          },
        },
      },
    });
  });

  for (const configured of [true, false]) {
    it(`prefers submitted edits over CI content in a restored ${configured ? 'configured' : 'orphan'} program`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-content-precedence-'));
      const baseDir = path.join(temporary, 'sources');
      const rulesWorkdir = path.join(temporary, 'work');
      const filePath = path.join(baseDir, 'existing.ts');
      const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
      const analysisMetadataPath = path.join(rulesWorkdir, 'analysis-metadata.pb.gz');
      const original = '[80, 3, 9].sort();';
      const edited = '[80, 3, 9].sort((a, b) => a - b);';
      fs.mkdirSync(baseDir);
      fs.mkdirSync(rulesWorkdir);
      fs.writeFileSync(filePath, original);
      if (configured) {
        fs.writeFileSync(path.join(baseDir, 'tsconfig.json'), '{"files":["existing.ts"]}');
      }
      (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();
      // Match the worker's production preload order, where TypeScript uses patched stat calls.
      const fileExists = mock.method(ts.sys, 'fileExists', (fileName: string) => {
        try {
          return fs.statSync(fileName).isFile();
        } catch {
          return false;
        }
      });
      const request = (
        mode: analyzeProjectProto.analyzeproject.v1.FilesystemCacheMode,
        fileContent?: string,
      ): AnalyzeProjectRequest => ({
        configuration: { baseDir, canAccessFileSystem: true },
        files: {
          [filePath]: {
            ...(fileContent === undefined ? {} : { fileContent }),
            fileType: FileType.FILE_TYPE_MAIN,
          },
        },
        rules: [
          {
            key: 'S2871',
            configurations: [],
            fileTypeTargets: [FileType.FILE_TYPE_MAIN],
            language: JsTsLanguage.JS_TS_LANGUAGE_TS,
            analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
          },
        ],
        cssRules: [],
        bundles: [],
        rulesWorkdir,
        filesystemCache: { archivePath, analysisMetadataPath, mode },
      });
      const analyze = async (input: AnalyzeProjectRequest, expectedIssueCount: number) => {
        const result = await handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: input },
          workerData,
        );
        expect(result).toMatchObject({
          type: 'success',
          result: {
            output: {
              files: {
                [normalizeToAbsolutePath(filePath)]: {
                  issues: expectedIssueCount ? [expect.objectContaining({ ruleId: 'S2871' })] : [],
                },
              },
            },
          },
        });
        // A successful source-only fallback must not masquerade as context restoration.
        expect(input.filesystemCache).toBeDefined();
      };
      try {
        // CI keeps UTF-8 files path-only, recording their actual filesystem contents.
        await analyze(request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD), 1);
        const archiveBefore = fs.readFileSync(archivePath);
        const metadataBefore = fs.readFileSync(analysisMetadataPath);
        fs.writeFileSync(filePath, edited);
        // Reproduce the old request shape: the native edit is hidden by the CI archive.
        await analyze(request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY), 1);
        // The fixed scanner request supplies content, including to the TypeScript program.
        await analyze(request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY, edited), 0);
        await analyze(request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY, original), 1);
        expect(fs.readFileSync(archivePath)).toEqual(archiveBefore);
        expect(fs.readFileSync(analysisMetadataPath)).toEqual(metadataBefore);
      } finally {
        fileExists.mock.restore();
      }
    });
  }

  it('falls back to a source-only orphan program for an unrecorded replay file', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'unsupported-program-outcome-'));
    const recordRoot = path.join(temporary, 'record');
    const replayRoot = path.join(temporary, 'replay');
    const rulesWorkdir = path.join(temporary, 'work');
    const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
    const analysisMetadataPath = path.join(rulesWorkdir, 'analysis-metadata.pb.gz');
    fs.mkdirSync(recordRoot);
    fs.mkdirSync(replayRoot);
    fs.mkdirSync(rulesWorkdir);
    fs.writeFileSync(path.join(recordRoot, 'known.ts'), '[80, 3, 9].sort();');
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();

    const createRequest = (baseDir: string, filename: string): AnalyzeProjectRequest => ({
      configuration: { baseDir, canAccessFileSystem: true },
      files: {
        [path.join(baseDir, filename)]: {
          fileContent: '[80, 3, 9].sort();',
          fileType: FileType.FILE_TYPE_MAIN,
        },
      },
      rules: [
        {
          key: 'S2871',
          configurations: [],
          fileTypeTargets: [FileType.FILE_TYPE_MAIN],
          language: JsTsLanguage.JS_TS_LANGUAGE_TS,
          analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
        },
      ],
      cssRules: [],
      bundles: [],
      rulesWorkdir,
      filesystemCache: {
        archivePath,
        analysisMetadataPath,
        mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
      },
    });

    const recorded = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: createRequest(recordRoot, 'known.ts') },
      workerData,
    );
    expect(recorded.type).toBe('success');

    const replayRequest = createRequest(replayRoot, 'new.ts');
    replayRequest.filesystemCache!.mode = FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY;
    replayRequest.configuration!.jsTsExclusions = { values: ['**/contrib/**'] };
    const log = mock.method(console, 'log');
    let replayed;
    try {
      replayed = await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: replayRequest },
        workerData,
      );
    } finally {
      log.mock.restore();
    }

    expect(replayed).toMatchObject({
      type: 'success',
      result: {
        output: {
          files: {
            [normalizeToAbsolutePath(path.join(replayRoot, 'new.ts'))]: {
              issues: [expect.objectContaining({ ruleId: 'S2871' })],
            },
          },
        },
      },
    });
    expect(replayRequest.configuration!.jsTsExclusions?.values).toEqual(['**/contrib/**']);
    expect(replayRequest.filesystemCache).toBeUndefined();
    expect(
      log.mock.calls.some(call =>
        String(call.arguments[0]).includes('Unsupported SonarJS context'),
      ),
    ).toBe(true);
    expect(
      log.mock.calls.some(call =>
        String(call.arguments[0]).includes('Analyzing 1 file(s) using default options'),
      ),
    ).toBe(true);
  });

  it('replays a file reached through an implicit tsconfig root and transitive imports', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'program-selection-import-'));
    const recordRoot = path.join(temporary, 'record');
    const replayRoot = path.join(temporary, 'replay');
    const rulesWorkdir = path.join(temporary, 'work');
    const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
    const analysisMetadataPath = path.join(rulesWorkdir, 'analysis-metadata.pb.gz');
    fs.mkdirSync(path.join(recordRoot, 'build/vite'), { recursive: true });
    fs.mkdirSync(path.join(recordRoot, 'src'), { recursive: true });
    fs.mkdirSync(rulesWorkdir);
    fs.writeFileSync(
      path.join(recordRoot, 'build/vite/tsconfig.json'),
      '{"compilerOptions":{"module":"preserve"}}',
    );
    fs.writeFileSync(path.join(recordRoot, 'build/vite/index.ts'), "import '../../src/entry.js';");
    fs.writeFileSync(
      path.join(recordRoot, 'src/entry.ts'),
      "import './processes.js';\nimport './scrollable.js';",
    );
    fs.writeFileSync(path.join(recordRoot, 'src/processes.ts'), 'export const p = 1;;');
    fs.writeFileSync(path.join(recordRoot, 'src/scrollable.ts'), 'export const s = 1;;');
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();
    // In production the worker installs the filesystem hook before loading TypeScript.
    // This test loads TypeScript first, so bind its cached stat-based fileExists
    // implementation to the hook, matching the production worker preload order.
    const fileExists = mock.method(ts.sys, 'fileExists', (fileName: string) => {
      try {
        return fs.statSync(fileName).isFile();
      } catch {
        return false;
      }
    });

    const request = (baseDir: string, relativeFiles: string[]): AnalyzeProjectRequest => ({
      configuration: { baseDir },
      files: Object.fromEntries(
        relativeFiles.map(relativePath => [
          path.join(baseDir, relativePath),
          {
            fileContent: fs.readFileSync(path.join(recordRoot, relativePath), 'utf8'),
            fileType: FileType.FILE_TYPE_MAIN,
          },
        ]),
      ),
      rules: [
        {
          key: 'S1116',
          configurations: [],
          fileTypeTargets: [FileType.FILE_TYPE_MAIN],
          language: JsTsLanguage.JS_TS_LANGUAGE_TS,
          analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
        },
      ],
      cssRules: [],
      bundles: [],
      rulesWorkdir,
      filesystemCache: {
        archivePath,
        analysisMetadataPath,
        mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
      },
    });

    try {
      const recorded = await handleAnalyzeProjectRequest(
        {
          type: 'on-analyze-project',
          data: request(recordRoot, [
            'build/vite/index.ts',
            'src/entry.ts',
            'src/processes.ts',
            'src/scrollable.ts',
          ]),
        },
        workerData,
      );
      expect(recorded.type).toBe('success');
      expect(fs.statSync(analysisMetadataPath).size).toBeGreaterThan(0);
      const archive = new FsCacheArchive({ archivePath, rootDir: recordRoot });
      archive.load();
      const intermediate = archive.keyFor(path.join(recordRoot, 'src/entry.ts'))!;
      expect(archive.get(intermediate, 'readFile')?.ok).toBe(true);
      expect(archive.get(intermediate, 'stat:number')).toBeUndefined();
      fs.mkdirSync(replayRoot);

      for (const relativePath of ['src/processes.ts', 'src/scrollable.ts']) {
        const replayRequest = request(replayRoot, [relativePath]);
        replayRequest.filesystemCache!.mode = FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY;
        const replayed = await handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: replayRequest },
          workerData,
        );
        expect(replayed).toMatchObject({
          type: 'success',
          result: {
            output: {
              files: {
                [normalizeToAbsolutePath(path.join(replayRoot, relativePath))]: {
                  issues: [expect.objectContaining({ ruleId: 'S1116' })],
                },
              },
            },
          },
        });
      }
    } finally {
      fileExists.mock.restore();
    }
  });

  it('replays dependency-gated rules after normal project discovery', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-project-replay-'));
    const recordRoot = path.join(temporary, 'record');
    const replayRoot = path.join(temporary, 'replay');
    const rulesWorkdir = path.join(temporary, 'work');
    const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
    const analysisMetadataPath = path.join(rulesWorkdir, 'analysis-metadata.pb.gz');
    fs.mkdirSync(recordRoot);
    fs.mkdirSync(rulesWorkdir);
    fs.writeFileSync(
      path.join(recordRoot, 'package.json'),
      '{"dependencies":{"@angular/core":"20.0.0"}}',
    );
    fs.writeFileSync(
      path.join(recordRoot, 'tsconfig.json'),
      '{"compilerOptions":{"experimentalDecorators":true},"files":["component.ts"]}',
    );
    fs.writeFileSync(
      path.join(recordRoot, 'component.ts'),
      "import { EventEmitter, Output } from '@angular/core';\nclass Component {\n  @Output() click = new EventEmitter<void>();\n}",
    );
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();

    const createRequest = (baseDir: string, sourceLine: number): AnalyzeProjectRequest => ({
      configuration: { baseDir },
      files: {
        [path.join(baseDir, 'component.ts')]: {
          fileContent: `${'\n'.repeat(sourceLine - 3)}import { EventEmitter, Output } from '@angular/core';\nclass Component {\n  @Output() click = new EventEmitter<void>();\n}`,
          fileType: FileType.FILE_TYPE_MAIN,
        },
      },
      rules: [
        {
          key: 'S7651',
          configurations: [],
          fileTypeTargets: [FileType.FILE_TYPE_MAIN],
          language: JsTsLanguage.JS_TS_LANGUAGE_TS,
          analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
        },
      ],
      cssRules: [],
      bundles: [],
      rulesWorkdir,
      filesystemCache: {
        archivePath,
        analysisMetadataPath,
        mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
      },
    });

    const recordRequest = createRequest(recordRoot, 3);
    recordRequest.configuration!.jsTsExclusions = { values: [] };
    const recorded = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: recordRequest },
      workerData,
    );
    expect(recorded).toMatchObject({
      result: {
        output: {
          files: {
            [normalizeToAbsolutePath(path.join(recordRoot, 'component.ts'))]: {
              issues: [expect.objectContaining({ line: 3, ruleId: 'S7651' })],
            },
          },
        },
      },
      type: 'success',
    });
    expect(fs.statSync(analysisMetadataPath).size).toBeGreaterThan(0);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const replayRequest = createRequest(replayRoot, 5);
    replayRequest.filesystemCache!.mode = FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY;
    replayRequest.configuration!.jsTsExclusions = { values: ['**/contrib/**'] };
    const replayed = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: replayRequest },
      workerData,
    );
    expect(replayRequest.configuration!.jsTsExclusions?.values).toEqual([]);
    expect(replayed).toMatchObject({
      result: {
        output: {
          files: {
            [normalizeToAbsolutePath(path.join(replayRoot, 'component.ts'))]: {
              issues: [expect.objectContaining({ line: 5, ruleId: 'S7651' })],
            },
          },
        },
      },
      type: 'success',
    });
  });

  it('activates and ends the request filesystem cache session', async () => {
    const sessions: Array<Record<string, unknown>> = [];
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = {
      beginAnalysis(options: Record<string, unknown>) {
        sessions.push({ ...options, event: 'begin' });
        return {
          end() {
            sessions.push({ archivePath: options.archivePath, event: 'end' });
          },
        };
      },
    };
    const request = createAnalyzeProjectRequest();
    request.rulesWorkdir = '.scannerwork';
    request.filesystemCache = {
      archivePath: '/cache/first.fscache',
      analysisMetadataPath: '/cache/analysis-metadata.pb.gz',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };

    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );

    expect(result).toMatchObject({ type: 'success' });
    expect(sessions).toEqual([
      {
        archivePath: '/cache/first.fscache',
        event: 'begin',
        mode: 'record',
        passthroughDirs: [
          normalizeToAbsolutePath('.scannerwork', normalizeToAbsolutePath('/project')),
        ],
        rootDir: '/project',
      },
      { archivePath: '/cache/first.fscache', event: 'end' },
    ]);
  });

  it('rejects filesystem cache configuration without an archive', async () => {
    const missingArchive = createAnalyzeProjectRequest();
    missingArchive.filesystemCache = { mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD };
    expect(
      await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: missingArchive },
        workerData,
      ),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });
  });

  it('rejects context artifacts without an explicit record or replay mode', async () => {
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = {
      archivePath: '/cache/filesystem.pb.gz',
      analysisMetadataPath: '/cache/analysis-metadata.pb.gz',
    };
    expect(
      await handleAnalyzeProjectRequest({ type: 'on-analyze-project', data: request }, workerData),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });
  });

  it('rejects exactly one context artifact before opening a cache session', async () => {
    let opened = false;
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = {
      beginAnalysis() {
        opened = true;
        throw new Error('Should not open an incomplete context');
      },
    };
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = {
      archivePath: '/cache/filesystem.pb.gz',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
    };
    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );
    expect(result).toMatchObject({ reason: 'invalid_request', type: 'failure' });
    expect(opened).toBe(false);
  });

  it('rejects filesystem cache configuration outside an analysis worker', async () => {
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = {
      archivePath: '/cache/first.fscache',
      analysisMetadataPath: '/cache/analysis-metadata.pb.gz',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };

    expect(
      await handleAnalyzeProjectRequest({ type: 'on-analyze-project', data: request }, workerData),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });
  });

  it('ends the filesystem cache session when request normalization fails', async () => {
    let ended = false;
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = {
      beginAnalysis() {
        return {
          end() {
            ended = true;
          },
        };
      },
    };
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = {
      archivePath: '/cache/first.fscache',
      analysisMetadataPath: '/cache/analysis-metadata.pb.gz',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };
    request.rules = [{}];

    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );

    expect(result).toMatchObject({ reason: 'invalid_request', type: 'failure' });
    expect(ended).toBe(true);
  });

  it('preserves a successful analysis and ends the filesystem session when selection persistence fails', async () => {
    let ended = false;
    (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = {
      beginAnalysis() {
        return {
          end() {
            ended = true;
          },
        };
      },
    };
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'program-selection-failure-'));
    const parentFile = path.join(temporary, 'not-a-directory');
    fs.writeFileSync(parentFile, 'file');
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = {
      archivePath: path.join(temporary, 'filesystem.pb.gz'),
      analysisMetadataPath: path.join(parentFile, 'analysis-metadata.pb.gz'),
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };

    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );

    expect(result).toMatchObject({ type: 'success' });
    expect(ended).toBe(true);
  });

  it('keeps SonarQube for IDE native and rejects cache configuration', async () => {
    const nativeRequest = createAnalyzeProjectRequest();
    nativeRequest.configuration!.sonarlint = true;
    expect(
      await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: nativeRequest },
        workerData,
      ),
    ).toMatchObject({ type: 'success' });

    nativeRequest.filesystemCache = {
      archivePath: '/cache/sonarlint.fscache',
      analysisMetadataPath: '/cache/analysis-metadata.pb.gz',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };
    expect(
      await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: nativeRequest },
        workerData,
      ),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });
  });

  it('should preserve cancellation received while normalizing a request', async () => {
    const events: AnalyzeProjectIncrementalEvent[] = [];
    const analysisResult = handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: createAnalyzeProjectRequest() },
      workerData,
      event => events.push(event),
    );

    const cancellationResult = await handleAnalyzeProjectRequest(
      { type: 'on-cancel-analysis' },
      workerData,
    );

    expect(cancellationResult).toEqual({ result: undefined, type: 'success' });
    expect(await analysisResult).toMatchObject({ type: 'success' });
    expect(events.map(({ event }) => event)).toEqual([{ messageType: 'cancelled' }]);

    const nextEvents: AnalyzeProjectIncrementalEvent[] = [];
    await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: createAnalyzeProjectRequest() },
      workerData,
      event => nextEvents.push(event),
    );

    expect(nextEvents.map(({ event }) => event.messageType)).toEqual(['meta']);
  });
});
