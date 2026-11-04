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
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { expect } from 'expect';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { handleAnalyzeProjectRequest } from '../src/analyze-project-handle-request.js';
import { toAnalyzeProjectUnaryResponse } from '../src/analyze-project-convert.js';
import { FS_CACHE_INSTALLATION, installFsCache } from '../../shared/src/fs-cache/hook.js';
import { FsCacheArchive } from '../../shared/src/fs-cache/archive.js';
import type { AnalyzeProjectProtoRequest } from '../src/analyze-project-request.js';
import { sonarjs } from '../src/proto/analyze-project.js';

const { AnalysisMode, FileType, FileStatus, JsTsLanguage } = sonarjs.analyzeproject.v1;
const source = "import { values } from './values';\nvalues.sort();\n";
let temporary: string;
let project: string;
let artifacts: string;

beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-snapshot-reuse-'));
  project = path.join(temporary, 'project');
  artifacts = path.join(temporary, 'artifacts');
  fs.mkdirSync(project);
  fs.mkdirSync(artifacts);
  fs.writeFileSync(path.join(project, 'cached.ts'), source);
  fs.writeFileSync(path.join(project, 'changed.ts'), source);
  fs.writeFileSync(path.join(project, 'values.ts'), 'export const values: number[] = [80, 3, 9];');
  fs.writeFileSync(
    path.join(project, 'tsconfig.json'),
    JSON.stringify({ files: ['cached.ts', 'changed.ts', 'values.ts'] }),
  );
  installFsCache();
  mock.method(ts.sys, 'fileExists', (file: string) => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
});
afterEach(() => {
  mock.reset();
  delete (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION];
  fs.rmSync(temporary, { recursive: true, force: true });
});

function request(generation: string): AnalyzeProjectProtoRequest {
  const directory = path.join(artifacts, generation);
  fs.mkdirSync(directory);
  return {
    configuration: {
      baseDir: project,
      canAccessFileSystem: true,
      skipAst: false,
      jsTsExclusions: { values: ['directory:' + project.replaceAll('\\', '/') + '/.scannerwork'] },
    },
    files: Object.fromEntries(
      ['cached.ts', 'changed.ts', 'values.ts'].map(file => [
        path.join(project, file),
        { fileType: FileType.FILE_TYPE_MAIN },
      ]),
    ),
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
    filesystemCache: {
      mode: 1,
      archivePath: path.join(directory, 'filesystem.pb.gz'),
      analysisMetadataPath: path.join(directory, 'programs.pb.gz'),
      snapshotManifestPath: path.join(directory, 'manifest.json'),
    },
  };
}
async function analyze(data: AnalyzeProjectProtoRequest) {
  const result = await handleAnalyzeProjectRequest(
    { type: 'on-analyze-project', data },
    { debugMemory: false },
  );
  if (result.type !== 'success' || !result.result) throw new Error(JSON.stringify(result));
  return toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap);
}
function seed(pr: AnalyzeProjectProtoRequest, baseline: AnalyzeProjectProtoRequest) {
  Object.assign(pr.filesystemCache!, {
    baselineArchivePath: baseline.filesystemCache!.archivePath,
    baselineAnalysisMetadataPath: baseline.filesystemCache!.analysisMetadataPath,
    baselineManifestPath: baseline.filesystemCache!.snapshotManifestPath,
    baselineContextMetadata: JSON.stringify({ configuration: baseline.configuration }),
  });
  pr.configuration!.analysisMode = AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED;
  // Java handles cache hits itself and sends only the file needing analysis.
  pr.files = { [path.join(project, 'changed.ts')]: { fileStatus: FileStatus.FILE_STATUS_CHANGED } };
}

function archive(request: AnalyzeProjectProtoRequest) {
  const archive = new FsCacheArchive({
    archivePath: request.filesystemCache!.archivePath!,
    rootDir: project,
    caseSensitivePaths: true,
    mode: 'replay',
  });
  archive.load();
  return archive;
}

async function replay(request: AnalyzeProjectProtoRequest, file: string, content: string) {
  return analyze({
    ...request,
    configuration: { ...request.configuration, analysisMode: AnalysisMode.ANALYSIS_MODE_DEFAULT },
    files: { [file]: { fileContent: content, fileType: FileType.FILE_TYPE_MAIN } },
    filesystemCache: {
      mode: 2,
      archivePath: request.filesystemCache!.archivePath,
      analysisMetadataPath: request.filesystemCache!.analysisMetadataPath,
      contextMetadata: JSON.stringify({ configuration: request.configuration }),
    },
  });
}

describe('passive sensor-cache context reuse', () => {
  for (const kind of ['configured', 'orphan', 'no program'] as const) {
    it('carries all-cached ' + kind + ' outcomes forward without reading sources', async () => {
      if (kind === 'orphan') fs.unlinkSync(path.join(project, 'tsconfig.json'));
      const branch = request('branch');
      branch.configuration!.disableTypeChecking = kind === 'no program';
      const original = await analyze(branch);
      const pr = request('pr');
      pr.configuration!.disableTypeChecking = branch.configuration!.disableTypeChecking;
      seed(pr, branch);
      pr.files = {};
      const observed: string[] = [];
      const set = FsCacheArchive.prototype.set;
      mock.method(
        FsCacheArchive.prototype,
        'set',
        function (this: FsCacheArchive, ...args: Parameters<typeof set>) {
          observed.push(this.absolutePathFor(args[0]));
          return set.apply(this, args);
        },
      );
      const result = await analyze(pr);
      expect(result.files).toEqual({});
      expect(result.meta?.telemetry?.programCreation?.attempted ?? 0).toBe(0);
      expect(observed).toEqual([]);
      expect(fs.existsSync(pr.filesystemCache!.snapshotManifestPath!)).toBe(true);
      mock.restoreAll();
      fs.rmSync(project, { recursive: true });
      const file = path.join(project, 'cached.ts');
      const restored = await replay(pr, file, source);
      expect(restored.files![file].issues).toEqual(original.files![file].issues);
    });
  }

  it('analyzes only the changed file while recording native dependency changes', async () => {
    const branch = request('branch');
    const original = await analyze(branch);
    const pr = request('pr');
    seed(pr, branch);
    const values = path.join(project, 'values.ts');
    const updated = 'export const values = { sort() {} };';
    fs.writeFileSync(values, updated);
    const result = await analyze(pr);
    expect(Object.keys(result.files!)).toEqual([path.join(project, 'changed.ts')]);
    expect(result.files![path.join(project, 'changed.ts')].issues).toHaveLength(0);
    const recorded = archive(pr);
    const content = recorded.entries.get(recorded.keyFor(values)!)?.content;
    expect(content?.ok && content.value.toString()).toBe(updated);
    fs.rmSync(project, { recursive: true });
    const file = path.join(project, 'cached.ts');
    const restored = await replay(pr, file, source);
    expect(original.files![file].issues).toHaveLength(1);
    expect(restored.files![file].issues).toHaveLength(0);
  });

  it('keeps untouched entries, including deleted sources, without a validation pass', async () => {
    const branch = request('branch');
    await analyze(branch);
    const pr = request('pr');
    seed(pr, branch);
    pr.files = {};
    const removed = path.join(project, 'cached.ts');
    fs.unlinkSync(removed);
    await analyze(pr);
    const recorded = archive(pr);
    const content = recorded.entries.get(recorded.keyFor(removed)!)?.content;
    expect(content?.ok && content.value.toString()).toBe(source);
    expect(recorded.entries.size).toBe(archive(branch).entries.size);
  });

  it('retains a baseline in a different checkout directory', async () => {
    const branch = request('branch');
    await analyze(branch);
    const relocated = path.join(temporary, 'relocated');
    fs.cpSync(project, relocated, { recursive: true });
    project = relocated;
    const pr = request('pr');
    seed(pr, branch);
    const result = await analyze(pr);
    expect(Object.keys(result.files!)).toEqual([path.join(project, 'changed.ts')]);
    fs.rmSync(project, { recursive: true });
    const file = path.join(project, 'cached.ts');
    expect((await replay(pr, file, source)).files![file].issues).toHaveLength(1);
  });

  it('keeps analysis working without publishing a corrupt supplied baseline', async () => {
    const branch = request('branch');
    await analyze(branch);
    fs.writeFileSync(branch.filesystemCache!.snapshotManifestPath!, '{broken');
    const pr = request('pr');
    seed(pr, branch);
    const result = await analyze(pr);
    expect(Object.keys(result.files!)).toEqual([path.join(project, 'changed.ts')]);
    expect(result.files![path.join(project, 'changed.ts')].issues).toHaveLength(1);
    expect(fs.existsSync(pr.filesystemCache!.snapshotManifestPath!)).toBe(false);
  });
});
