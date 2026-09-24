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
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const workerData: WorkerData = { debugMemory: false };
type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
const { AnalysisMode, FileType, JsTsLanguage } = analyzeProjectProto.analyzeproject.v1;

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
  it('replays dependency-gated rules after normal project discovery', async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-project-replay-'));
    const recordRoot = path.join(temporary, 'record');
    const replayRoot = path.join(temporary, 'replay');
    const rulesWorkdir = path.join(temporary, 'work');
    const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
    const programSelectionPath = path.join(rulesWorkdir, 'program-selection.pb.gz');
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
      filesystemCache: { archivePath, programSelectionPath },
    });

    const recorded = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: createRequest(recordRoot, 3) },
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
    expect(fs.statSync(programSelectionPath).size).toBeGreaterThan(0);

    fs.rmSync(recordRoot, { force: true, recursive: true });
    fs.mkdirSync(replayRoot);
    const log = mock.method(console, 'log', () => undefined);
    let replayed: Awaited<ReturnType<typeof handleAnalyzeProjectRequest>>;
    try {
      replayed = await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: createRequest(replayRoot, 5) },
        workerData,
        undefined,
        'replay-123',
      );
      const timingLine = log.mock.calls
        .map(call => call.arguments[0])
        .find(
          value =>
            typeof value === 'string' && value.startsWith('Filesystem cache analysis timing '),
        );
      expect(timingLine).toBeDefined();
      const timing = JSON.parse(
        (timingLine as string).slice('Filesystem cache analysis timing '.length),
      );
      expect(timing).toMatchObject({
        requestId: 'replay-123',
        mode: 'replay',
        outcome: 'success',
        phases: {
          filesystemArchiveLoad: { count: 1 },
          programSelectionLoad: { count: 1 },
          typescriptProgramCreation: { count: 1 },
          fileAnalysis: { count: 1 },
        },
      });
    } finally {
      log.mock.restore();
    }
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
    missingArchive.filesystemCache = {};
    expect(
      await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: missingArchive },
        workerData,
      ),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });
  });

  it('rejects filesystem cache configuration outside an analysis worker', async () => {
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = { archivePath: '/cache/first.fscache' };

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
      programSelectionPath: path.join(parentFile, 'selection.pb.gz'),
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
