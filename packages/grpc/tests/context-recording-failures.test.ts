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
import { afterEach, beforeEach, it, mock } from 'node:test';
import { expect } from 'expect';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { handleAnalyzeProjectRequest } from '../src/analyze-project-handle-request.js';
import type { AnalyzeProjectProtoRequest } from '../src/analyze-project-request.js';
import { ProgramSelectionArchive } from '../../analysis/src/program-selection/archive.js';
import { FsCacheArchive } from '../../shared/src/fs-cache/archive.js';
import { FS_CACHE_INSTALLATION, installFsCache } from '../../shared/src/fs-cache/hook.js';
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { Linter } from '../../analysis/src/jsts/linter/linter.js';

let temporary: string;
let request: AnalyzeProjectProtoRequest;
beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'context-failure-'));
  const project = path.join(temporary, 'project');
  fs.mkdirSync(project);
  request = {
    configuration: { baseDir: project, disableTypeChecking: true, canAccessFileSystem: true },
    files: { [path.join(project, 'main.js')]: { fileContent: 'foo();;' } },
    rules: [{ key: 'S1116', language: 1, fileTypeTargets: [1], analysisModes: [1] }],
    filesystemCache: {
      mode: 1,
      archivePath: path.join(temporary, 'filesystem.pb.gz'),
      analysisMetadataPath: path.join(temporary, 'programs.pb.gz'),
      snapshotManifestPath: path.join(temporary, 'manifest.json'),
    },
  };
  installFsCache();
});
afterEach(() => {
  mock.restoreAll();
  delete (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION];
  fs.rmSync(temporary, { recursive: true, force: true });
});

for (const failure of ['initialization', 'metadata', 'filesystem', 'manifest'] as const) {
  it(`preserves successful analysis without publishing context after ${failure} failure`, async () => {
    const fail = () => {
      throw new Error('injected context failure');
    };
    if (failure === 'initialization') {
      (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = { beginAnalysis: fail };
    } else if (failure === 'metadata') {
      mock.method(ProgramSelectionArchive.prototype, 'end', fail);
    } else if (failure === 'filesystem') {
      mock.method(FsCacheArchive.prototype, 'flush', fail);
    } else {
      fs.mkdirSync(request.filesystemCache!.snapshotManifestPath!);
    }
    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      { debugMemory: false },
    );
    expect(result.type).toBe('success');
    if (result.type === 'success' && result.result) {
      const file = Object.values(result.result.output.files)[0];
      expect('issues' in file && file.issues).toHaveLength(1);
    }
    const marker = request.filesystemCache!.snapshotManifestPath!;
    expect(fs.existsSync(marker) && fs.statSync(marker).isFile()).toBe(false);
  });
}

for (const baseline of [false, true]) {
  it(`handles an empty all-cached request without source reads/programs (baseline: ${baseline})`, async () => {
    const project = request.configuration!.baseDir!;
    const file = path.join(project, 'codegen.ts');
    fs.writeFileSync(file, 'export default {};');
    request.files = { [file]: { fileContent: 'export default {};' } };
    if (baseline) {
      const cold = await handleAnalyzeProjectRequest(
        { type: 'on-analyze-project', data: request },
        { debugMemory: false },
      );
      expect(cold.type).toBe('success');
      expect(fs.existsSync(request.filesystemCache!.snapshotManifestPath!)).toBe(true);
      const previous = request.filesystemCache!;
      request.filesystemCache = {
        mode: 1,
        archivePath: path.join(temporary, 'warm-filesystem.pb.gz'),
        analysisMetadataPath: path.join(temporary, 'warm-programs.pb.gz'),
        snapshotManifestPath: path.join(temporary, 'warm-manifest.json'),
        baselineArchivePath: previous.archivePath,
        baselineAnalysisMetadataPath: previous.analysisMetadataPath,
        baselineManifestPath: previous.snapshotManifestPath,
        baselineContextMetadata: JSON.stringify({ configuration: request.configuration }),
      };
    }
    request.files = {};
    const observed: string[] = [];
    const set = FsCacheArchive.prototype.set;
    mock.method(
      FsCacheArchive.prototype,
      'set',
      function (this: FsCacheArchive, ...args: Parameters<typeof set>) {
        if (args[1] === 'readFile') observed.push(this.absolutePathFor(args[0]));
        return set.apply(this, args);
      },
    );
    const result = await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      { debugMemory: false },
    );
    expect(result.type).toBe('success');
    if (result.type === 'success' && result.result) {
      expect(result.result.output.files).toEqual({});
      expect(result.result.output.meta?.telemetry?.programCreation.attempted).toBe(0);
      expect(result.result.pathMap.size).toBe(0);
    }
    expect(observed).not.toContain(normalizeToAbsolutePath(file));
    expect(fs.existsSync(request.filesystemCache!.snapshotManifestPath!)).toBe(true);
  });
}

it('records supplied contents and no-program outcomes for filtered sources', async () => {
  const file = Object.keys(request.files!)[0];
  request.configuration!.maxFileSize = 1;
  request.files![file].fileContent = ' '.repeat(1100);
  const result = await handleAnalyzeProjectRequest(
    { type: 'on-analyze-project', data: request },
    { debugMemory: false },
  );
  expect(result.type).toBe('success');
  expect(fs.existsSync(request.filesystemCache!.snapshotManifestPath!)).toBe(true);
  const archive = new FsCacheArchive({
    archivePath: request.filesystemCache!.archivePath!,
    rootDir: request.configuration!.baseDir!,
    caseSensitivePaths: true,
    mode: 'replay',
  });
  archive.load();
  expect(archive.entries.get(archive.keyFor(file)!)?.content?.ok).toBe(true);
  const metadata = new ProgramSelectionArchive(
    request.filesystemCache!.analysisMetadataPath!,
    normalizeToAbsolutePath(request.configuration!.baseDir!),
    'replay',
    false,
    JSON.stringify({ configuration: request.configuration }),
  );
  expect(metadata.hasNoProgram(normalizeToAbsolutePath(file))).toBe(true);
});

for (const interrupted of ['cancellation', 'file error'] as const) {
  it(`does not publish a completion marker after ${interrupted}`, async () => {
    if (interrupted === 'file error') {
      mock.method(Linter, 'lint', () => {
        throw new Error('injected rule failure');
      });
    }
    await handleAnalyzeProjectRequest(
      { type: 'on-analyze-project', data: request },
      { debugMemory: false },
      event => {
        if (interrupted === 'cancellation' && event.event.messageType === 'fileResult') {
          void handleAnalyzeProjectRequest({ type: 'on-cancel-analysis' }, { debugMemory: false });
        }
      },
    );
    expect(fs.existsSync(request.filesystemCache!.snapshotManifestPath!)).toBe(false);
  });
}

for (const caseOnlyRename of [false, true]) {
  it(`keeps orphan analysis independent of the baseline (case-only rename: ${caseOnlyRename})`, async () => {
    const project = request.configuration!.baseDir!;
    const ambient = path.join(project, 'ambient.ts');
    const original = path.join(project, 'Changed.ts');
    const changed = caseOnlyRename ? path.join(project, 'changed.ts') : original;
    const content = 'values.sort();\nexport {};';
    const nativeCaseSensitivity = ts.sys.useCaseSensitiveFileNames;
    if (caseOnlyRename) {
      // A request may use the new spelling before the old metadata has been replaced.
      ts.sys.useCaseSensitiveFileNames = false;
    }
    try {
      fs.writeFileSync(ambient, 'declare const values: number[];');
      fs.writeFileSync(original, content);
      request.configuration!.disableTypeChecking = false;
      request.files = { [ambient]: {}, [original]: {} };
      request.rules = [{ key: 'S2871', language: 2, fileTypeTargets: [1], analysisModes: [1] }];
      const analyze = () =>
        handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: request },
          { debugMemory: false },
        );
      const cold = await analyze();
      expect(cold.type).toBe('success');
      if (cold.type === 'success' && cold.result) {
        const file = cold.result.output.files[normalizeToAbsolutePath(original)];
        expect('issues' in file && file.issues).toHaveLength(1);
      }
      const previous = request.filesystemCache!;
      request.files = { [changed]: { fileContent: content } };
      request.filesystemCache = undefined;
      const ruleExecutions = mock.method(Linter.rules.S2871, 'create');
      const ordinary = await analyze();
      expect(ordinary.type).toBe('success');
      expect(ruleExecutions.mock.callCount()).toBe(1);
      request.filesystemCache = {
        mode: 1,
        archivePath: path.join(temporary, 'warm-filesystem.pb.gz'),
        analysisMetadataPath: path.join(temporary, 'warm-programs.pb.gz'),
        snapshotManifestPath: path.join(temporary, 'warm-manifest.json'),
        baselineArchivePath: previous.archivePath,
        baselineAnalysisMetadataPath: previous.analysisMetadataPath,
        baselineManifestPath: previous.snapshotManifestPath,
        baselineContextMetadata: JSON.stringify({ configuration: request.configuration }),
      };
      const groups = mock.method(ProgramSelectionArchive.prototype, 'recordOrphanGroup');
      const observed: string[] = [];
      const set = FsCacheArchive.prototype.set;
      mock.method(
        FsCacheArchive.prototype,
        'set',
        function (this: FsCacheArchive, ...args: Parameters<typeof set>) {
          if (args[1] === 'readFile') observed.push(this.absolutePathFor(args[0]));
          return set.apply(this, args);
        },
      );
      const warm = await analyze();
      expect(warm.type).toBe('success');
      expect(ruleExecutions.mock.calls.map(call => call.arguments[0].filename)).toEqual([
        normalizeToAbsolutePath(changed),
        normalizeToAbsolutePath(changed),
      ]);
      if (
        warm.type === 'success' &&
        warm.result &&
        ordinary.type === 'success' &&
        ordinary.result
      ) {
        const file = warm.result.output.files[normalizeToAbsolutePath(changed)];
        // The omitted ambient peer is the existing incremental limitation tracked by JS-2815.
        expect('issues' in file && file.issues).toEqual([]);
        expect(warm.result.output.files).toEqual(ordinary.result.output.files);
        expect(Object.keys(warm.result.output.files)).toEqual([normalizeToAbsolutePath(changed)]);
        expect(ordinary.result.output.meta.telemetry?.programCreation.attempted).toBe(1);
        expect(warm.result.output.meta.telemetry?.programCreation.attempted).toBe(1);
      }
      expect(groups.mock.calls.map(call => call.arguments[0])).toEqual([
        [normalizeToAbsolutePath(changed)],
      ]);
      expect(observed).not.toContain(normalizeToAbsolutePath(ambient));
      expect(fs.existsSync(request.filesystemCache.snapshotManifestPath!)).toBe(true);
      const metadata = new ProgramSelectionArchive(
        request.filesystemCache.analysisMetadataPath!,
        normalizeToAbsolutePath(project),
        'replay',
      );
      expect(
        metadata.getRestoredSelections([normalizeToAbsolutePath(changed)])[0].rootNames,
      ).toEqual([normalizeToAbsolutePath(changed)]);
    } finally {
      ts.sys.useCaseSensitiveFileNames = nativeCaseSensitivity;
    }
  });
}
