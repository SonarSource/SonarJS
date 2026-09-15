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

import { afterEach, describe, it } from 'node:test';
import { expect } from 'expect';
import {
  handleAnalyzeProjectRequest,
  type WorkerData,
} from '../src/analyze-project-handle-request.js';
import type { AnalyzeProjectIncrementalEvent } from '../src/analyze-project-request.js';
import { sonarjs as analyzeProjectProto } from '../src/proto/analyze-project.js';

const workerData: WorkerData = { debugMemory: false };
type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
const { FilesystemCacheMode } = analyzeProjectProto.analyzeproject.v1;
const filesystemCacheInstallation = Symbol.for('sonarjs.filesystemCache.installation');

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[filesystemCacheInstallation];
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
  it('activates and ends the request filesystem cache session', async () => {
    const sessions: Array<Record<string, unknown>> = [];
    (globalThis as Record<symbol, unknown>)[filesystemCacheInstallation] = {
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
    request.filesystemCache = {
      analyzerVersion: 'test-analyzer',
      archivePath: '/cache/first.fscache',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };

    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );

    expect(result).toMatchObject({ type: 'success' });
    expect(sessions).toEqual([
      {
        analyzerVersion: 'test-analyzer',
        archivePath: '/cache/first.fscache',
        event: 'begin',
        mode: 'record',
        rootDir: '/project',
        strict: false,
      },
      { archivePath: '/cache/first.fscache', event: 'end' },
    ]);
  });

  it('enables strict replay for the request archive', async () => {
    let receivedOptions: Record<string, unknown> | undefined;
    (globalThis as Record<symbol, unknown>)[filesystemCacheInstallation] = {
      beginAnalysis(options: Record<string, unknown>) {
        receivedOptions = options;
        return { end() {} };
      },
    };
    const request = createAnalyzeProjectRequest();
    request.filesystemCache = {
      archivePath: '/cache/replay.fscache',
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
    };

    expect(
      await handleAnalyzeProjectRequest({ type: 'on-analyze-project', data: request }, workerData),
    ).toMatchObject({ type: 'success' });
    expect(receivedOptions).toMatchObject({ mode: 'replay', strict: true });
  });

  it('rejects incomplete filesystem cache configuration', async () => {
    const missingArchive = createAnalyzeProjectRequest();
    missingArchive.filesystemCache = {
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD,
    };
    expect(
      await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: missingArchive },
        workerData,
      ),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });

    const missingMode = createAnalyzeProjectRequest();
    missingMode.filesystemCache = { archivePath: '/cache/unspecified.fscache' };
    expect(
      await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: missingMode },
        workerData,
      ),
    ).toMatchObject({ reason: 'invalid_request', type: 'failure' });
  });

  it('ends the filesystem cache session when request normalization fails', async () => {
    let ended = false;
    (globalThis as Record<symbol, unknown>)[filesystemCacheInstallation] = {
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
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
    };
    request.rules = [{}];

    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      workerData,
    );

    expect(result).toMatchObject({ reason: 'invalid_request', type: 'failure' });
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
      mode: FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
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
