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

const { AnalysisMode, FileType, JsTsLanguage } = sonarjs.analyzeproject.v1;
const source = "import { values } from './values';\nvalues.sort();\n";
let temporary: string;
let project: string;
let artifacts: string;
let fileExists: ReturnType<typeof mock.method>;

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
  fileExists = mock.method(ts.sys, 'fileExists', (file: string) => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });
});
afterEach(() => {
  fileExists.mock.restore();
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
  pr.files![path.join(project, 'cached.ts')].reuseCachedAnalysis = true;
  pr.files![path.join(project, 'values.ts')].reuseCachedAnalysis = true;
}

describe('sensor-cache context snapshot reuse', () => {
  for (const programKind of ['configured', 'orphan', 'no program'] as const) {
    it('replays a fully cached context with ' + programKind + ' outcomes', async () => {
      if (programKind === 'orphan') fs.unlinkSync(path.join(project, 'tsconfig.json'));
      const branch = request('branch');
      branch.configuration!.disableTypeChecking = programKind === 'no program';
      const original = await analyze(branch);
      const pr = request('pr');
      pr.configuration!.disableTypeChecking = branch.configuration!.disableTypeChecking;
      seed(pr, branch);
      for (const input of Object.values(pr.files!)) input.reuseCachedAnalysis = true;
      const reused = await analyze(pr);
      for (const result of Object.values(reused.files!)) expect(result.cacheHit).toBe(true);
      fs.rmSync(project, { recursive: true });
      const fallback = path.join(temporary, 'sqaa');
      fs.mkdirSync(fallback);
      const replay = await analyze({
        ...pr,
        files: {
          [path.join(project, 'cached.ts')]: {
            fileType: FileType.FILE_TYPE_MAIN,
            fileContent: source,
          },
        },
        filesystemCache: {
          mode: 2,
          archivePath: pr.filesystemCache!.archivePath,
          analysisMetadataPath: pr.filesystemCache!.analysisMetadataPath,
          contextMetadata: JSON.stringify({ configuration: pr.configuration }),
          fallbackBaseDir: fallback,
        },
      });
      expect(replay.files![path.join(project, 'cached.ts')].issues).toEqual(
        original.files![path.join(project, 'cached.ts')].issues,
      );
    });
  }

  it('reuses a portable baseline in a different checkout directory', async () => {
    const branch = request('branch');
    await analyze(branch);
    const relocated = path.join(temporary, 'another-checkout');
    fs.cpSync(project, relocated, { recursive: true });
    project = relocated;
    const pr = request('relocated');
    seed(pr, branch);
    const result = await analyze(pr);
    expect(result.files![path.join(project, 'cached.ts')].cacheHit).toBe(true);
  });
  it('reuses unchanged analysis and publishes a complete PR context that replays without the checkout', async () => {
    const branch = request('branch');
    await analyze(branch);
    const baselineBytes = fs.readFileSync(branch.filesystemCache!.archivePath!);
    fs.writeFileSync(
      path.join(project, 'changed.ts'),
      source.replace('sort()', 'sort((a, b) => a - b)'),
    );
    fs.writeFileSync(
      path.join(project, 'values.ts'),
      "export const values: string[] = ['b', 'a'];",
    );
    const pr = request('pr');
    seed(pr, branch);
    pr.files![path.join(project, 'values.ts')].reuseCachedAnalysis = false;
    const result = await analyze(pr);
    expect(result.files![path.join(project, 'cached.ts')].cacheHit).toBe(true);
    expect(result.files![path.join(project, 'values.ts')].cacheHit).not.toBe(true);
    expect(result.files![path.join(project, 'changed.ts')].issues).toHaveLength(0);
    expect(fs.readFileSync(branch.filesystemCache!.archivePath!)).toEqual(baselineBytes);

    const cold = request('cold');
    const fresh = await analyze(cold);
    fs.rmSync(project, { recursive: true });
    const fallback = path.join(temporary, 'sqaa');
    fs.mkdirSync(fallback);
    const replay: AnalyzeProjectProtoRequest = {
      ...pr,
      files: {
        [path.join(project, 'cached.ts')]: {
          fileType: FileType.FILE_TYPE_MAIN,
          fileContent: source,
        },
      },
      filesystemCache: {
        mode: 2,
        archivePath: pr.filesystemCache!.archivePath,
        analysisMetadataPath: pr.filesystemCache!.analysisMetadataPath,
        contextMetadata: JSON.stringify({ configuration: pr.configuration }),
        fallbackBaseDir: fallback,
      },
    };
    const replayed = await analyze(replay);
    expect(replayed.files![path.join(project, 'cached.ts')].issues).toEqual(
      fresh.files![path.join(project, 'cached.ts')].issues,
    );
    expect(replayed.files![path.join(project, 'cached.ts')].issues?.[0]?.message).toContain(
      'String.localeCompare',
    );
  });

  for (const change of [
    'imports',
    'tsconfig',
    'added file',
    'corrupt metadata',
    'provided contents',
  ] as const) {
    it('records a full context when ' + change + ' prevents reuse', async () => {
      const branch = request('branch');
      await analyze(branch);
      const pr = request('pr');
      seed(pr, branch);
      if (change === 'imports')
        fs.writeFileSync(
          path.join(project, 'changed.ts'),
          source.replace("'./values'", "'./values.js'"),
        );
      if (change === 'tsconfig')
        fs.writeFileSync(
          path.join(project, 'tsconfig.json'),
          '{"include":["*.ts"],"compilerOptions":{"strict":true}}',
        );
      if (change === 'added file')
        fs.writeFileSync(path.join(project, 'extra.ts'), 'export const extra = 1;');
      if (change === 'corrupt metadata')
        fs.writeFileSync(branch.filesystemCache!.analysisMetadataPath!, 'corrupt');
      if (change === 'provided contents')
        pr.files![path.join(project, 'cached.ts')].fileContent = source;
      const result = await analyze(pr);
      expect(result.files![path.join(project, 'cached.ts')].cacheHit).not.toBe(true);
      expect(result.files![path.join(project, 'cached.ts')].issues).toHaveLength(1);
      expect(fs.existsSync(pr.filesystemCache!.snapshotManifestPath!)).toBe(true);
    });
  }

  it('invalidates a recorded missing path when the PR creates it', async () => {
    const branch = request('branch');
    await analyze(branch);
    const archive = new FsCacheArchive({
      archivePath: branch.filesystemCache!.archivePath!,
      rootDir: project,
      mode: 'record',
      caseSensitivePaths: true,
    });
    archive.load();
    archive.set('new-dependency.json', 'exists', { ok: true, value: false });
    archive.flush();
    fs.writeFileSync(path.join(project, 'new-dependency.json'), '{}');
    const pr = request('pr');
    seed(pr, branch);
    const result = await analyze(pr);
    expect(result.files![path.join(project, 'cached.ts')].cacheHit).not.toBe(true);
  });
});
