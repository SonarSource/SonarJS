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
import { normalizeToAbsolutePath } from '../../shared/src/helpers/files.js';
import { ProgramSelectionArchive } from '../../analysis/src/program-selection/archive.js';
import { Linter } from '../../analysis/src/jsts/linter/linter.js';
import { sonarjs } from '../src/proto/analyze-project.js';

const { AnalysisMode, FileType, FileStatus, JsTsLanguage } = sonarjs.analyzeproject.v1;
const source = "import { values } from './values';\nvalues.sort();\n";
let temporary: string;
let project: string;
let artifacts: string;

beforeEach(() => {
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sonarjs-fresh-context-'));
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
        normalizeToAbsolutePath(path.join(project, file)),
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

function prRequest(generation: string, allCached = false): AnalyzeProjectProtoRequest {
  const pr = request(generation);
  pr.configuration!.analysisMode = AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED;
  for (const [file, input] of Object.entries(pr.files!)) {
    input.skipAnalysis = allCached || !file.endsWith('changed.ts');
    input.fileStatus = input.skipAnalysis
      ? FileStatus.FILE_STATUS_SAME
      : FileStatus.FILE_STATUS_CHANGED;
  }
  return pr;
}

function selection(request: AnalyzeProjectProtoRequest) {
  return new ProgramSelectionArchive(
    request.filesystemCache!.analysisMetadataPath!,
    normalizeToAbsolutePath(project),
    'replay',
    true,
    JSON.stringify({ configuration: request.configuration }),
  );
}

function file(name: string) {
  return normalizeToAbsolutePath(path.join(project, name));
}

describe('self-contained PR context', () => {
  for (const encoding of ['utf8', 'utf8-bom', 'utf16le', 'utf16be'] as const) {
    it(`preserves tsconfig path aliases in ordinary analysis, recording and replay; encoding=${encoding}`, async () => {
      const content = "import { values } from '@values';\nvalues.sort();\n";
      fs.writeFileSync(file('changed.ts'), content);
      const config = JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@values': ['./values.ts'] } },
        files: ['cached.ts', 'changed.ts', 'values.ts'],
      });
      let bytes = Buffer.from(config, encoding.startsWith('utf16') ? 'utf16le' : 'utf8');
      if (encoding === 'utf16be') bytes.swap16();
      const bom = {
        utf8: [],
        'utf8-bom': [0xef, 0xbb, 0xbf],
        utf16le: [0xff, 0xfe],
        utf16be: [0xfe, 0xff],
      }[encoding];
      bytes = Buffer.concat([Buffer.from(bom), bytes]);
      fs.writeFileSync(file('tsconfig.json'), bytes);

      const ordinary = request('ordinary');
      ordinary.filesystemCache = undefined;
      const recorded = prRequest('pr');
      for (const input of [ordinary, recorded]) {
        const result = await analyze(input);
        expect(result.files![file('changed.ts')].issues!.map(issue => issue.ruleId)).toEqual([
          'S2871',
        ]);
        expect(result.meta!.warnings).toEqual([]);
      }
      expect(archive(recorded).get('tsconfig.json', 'readFile')).toEqual({
        ok: true,
        value: bytes,
      });
      fs.rmSync(project, { recursive: true });
      fs.mkdirSync(project);

      const result = await replay(recorded, file('changed.ts'), content);
      expect(result.files![file('changed.ts')].issues!.map(issue => issue.ruleId)).toEqual([
        'S2871',
      ]);
      expect(result.meta!.warnings).toEqual([]);
    });
  }

  for (const missingConfig of ['unused', 'selected']) {
    it(`requires archived config contents only for the selected program; missing=${missingConfig}`, async () => {
      const unused = path.join(project, 'z-unused');
      fs.mkdirSync(unused);
      fs.writeFileSync(path.join(unused, 'tsconfig.json'), '{}');
      const pr = prRequest('pr');
      await analyze(pr);
      const snapshot = archive(pr);
      const config =
        missingConfig === 'selected' ? file('tsconfig.json') : file('z-unused/tsconfig.json');
      delete snapshot.entries.get(snapshot.keyFor(config)!)!.content;
      // Write a separate archive so flush does not merge the removed observation back in.
      snapshot.archivePath = path.join(artifacts, 'sparse.pb.gz');
      snapshot.mode = 'record';
      snapshot.dirty = true;
      snapshot.flush();
      pr.filesystemCache!.archivePath = snapshot.archivePath;
      fs.rmSync(project, { recursive: true });
      fs.mkdirSync(project);

      const result = await replay(pr, file('changed.ts'), source);
      expect(result.files![file('changed.ts')].issues).toHaveLength(
        missingConfig === 'unused' ? 1 : 0,
      );
      if (missingConfig === 'unused') {
        expect(result.meta!.warnings).toEqual([]);
      } else {
        expect(result.meta!.warnings).toEqual([
          expect.stringContaining('falling back to source-only analysis'),
        ]);
      }
    });
  }

  for (const kind of ['configured', 'orphan', 'no program'] as const) {
    it('records fresh all-cached ' + kind + ' outcomes without a baseline', async () => {
      if (kind === 'orphan') fs.unlinkSync(file('tsconfig.json'));
      const pr = prRequest('pr', true);
      pr.configuration!.disableTypeChecking = kind === 'no program';
      const updated = 'export const values = { sort() {} };';
      fs.writeFileSync(file('values.ts'), updated);
      const lint = mock.method(Linter, 'lint');
      const result = await analyze(pr);
      expect(result.files).toEqual({});
      expect(lint.mock.callCount()).toBe(0);
      expect(result.meta?.telemetry?.programCreation?.attempted ?? 0).toBe(
        kind === 'no program' ? 0 : 1,
      );
      expect(archive(pr).get('values.ts', 'readFile')).toEqual({
        ok: true,
        value: Buffer.from(updated),
      });
      const metadata = selection(pr);
      for (const name of ['cached.ts', 'changed.ts', 'values.ts']) {
        expect(metadata.hasSelection(file(name))).toBe(kind !== 'no program');
        expect(metadata.hasNoProgram(file(name))).toBe(kind === 'no program');
      }
      expect(fs.existsSync(pr.filesystemCache!.snapshotManifestPath!)).toBe(true);
      fs.rmSync(project, { recursive: true });
      expect(
        (await replay(pr, file('cached.ts'), source)).files![file('cached.ts')].issues,
      ).toHaveLength(0);
    });
  }

  it('executes rules for cache misses, including SAME files, and maps cache hits', async () => {
    const pr = prRequest('pr');
    pr.files![file('changed.ts')].fileStatus = FileStatus.FILE_STATUS_SAME;
    const result = await analyze(pr);
    expect(Object.keys(result.files!)).toEqual([file('changed.ts')]);
    expect(result.files![file('changed.ts')].cpdTokens!.length).toBeGreaterThan(0);
    expect(selection(pr).hasSelection(file('cached.ts'))).toBe(true);
  });

  it('records no-program outcomes for cached files when orphan programs are disabled', async () => {
    fs.unlinkSync(file('tsconfig.json'));
    const pr = prRequest('pr', true);
    pr.configuration!.createTsProgramForOrphanFiles = false;
    expect((await analyze(pr)).files).toEqual({});
    expect(selection(pr).hasNoProgram(file('cached.ts'))).toBe(true);
  });

  it('uses the current orphan roots for analysis as well as replay', async () => {
    fs.unlinkSync(file('tsconfig.json'));
    fs.writeFileSync(file('cached.ts'), 'declare const values: number[];');
    fs.writeFileSync(file('changed.ts'), 'values.sort();');
    const pr = prRequest('pr');
    delete pr.files![file('values.ts')];
    const result = await analyze(pr);
    expect(Object.keys(result.files!)).toEqual([file('changed.ts')]);
    expect(result.files![file('changed.ts')].issues).toHaveLength(1);
    fs.rmSync(project, { recursive: true });
    expect(
      (await replay(pr, file('changed.ts'), 'values.sort();')).files![file('changed.ts')].issues,
    ).toEqual(result.files![file('changed.ts')].issues);
  });

  it('remaps a cached file after an import removal and never retains deleted inputs', async () => {
    fs.writeFileSync(file('changed.ts'), source + "import './cached';");
    fs.writeFileSync(file('tsconfig.json'), JSON.stringify({ files: ['changed.ts'] }));
    const branch = request('branch');
    await analyze(branch);
    expect(selection(branch).getRestoredSelections([file('cached.ts')])[0].program.kind).toBe(
      'configured',
    );
    fs.writeFileSync(file('changed.ts'), source);
    fs.unlinkSync(file('values.ts'));
    const pr = prRequest('pr');
    delete pr.files![file('values.ts')];
    await analyze(pr);
    const metadata = selection(pr);
    expect(metadata.getRestoredSelections([file('cached.ts')])[0].program.kind).toBe('orphan');
    expect(metadata.hasSelection(file('values.ts'))).toBe(false);
    expect(archive(pr).get('values.ts', 'readFile')?.ok).not.toBe(true);
    fs.rmSync(project, { recursive: true });
    expect(
      (await replay(pr, file('cached.ts'), source)).files![file('cached.ts')],
    ).not.toHaveProperty('error');
  });

  it('processes independent and overlapping configs in the normal order even with no rule work', async () => {
    const first = file('a.json');
    const second = file('b.json');
    fs.writeFileSync(
      first,
      JSON.stringify({ files: ['cached.ts'], compilerOptions: { strict: true } }),
    );
    fs.writeFileSync(second, JSON.stringify({ files: ['cached.ts', 'changed.ts', 'values.ts'] }));
    const pr = prRequest('pr', true);
    pr.configuration!.tsConfigPaths = [first, second];
    const result = await analyze(pr);
    expect(result.files).toEqual({});
    expect(result.meta?.telemetry?.programCreation?.attempted).toBe(2);
    const metadata = selection(pr);
    const programs = metadata.getRestoredSelections([file('cached.ts'), file('changed.ts')]);
    expect(programs.map(p => p.program.kind === 'configured' && p.program.tsconfig)).toEqual([
      first,
      second,
    ]);
  });

  it('discovers referenced configs when every source is cached', async () => {
    fs.mkdirSync(file('child'));
    const child = file('child/tsconfig.json');
    fs.writeFileSync(
      child,
      JSON.stringify({ files: ['../cached.ts', '../changed.ts', '../values.ts'] }),
    );
    fs.writeFileSync(
      file('tsconfig.json'),
      JSON.stringify({ files: [], references: [{ path: './child' }] }),
    );
    const pr = prRequest('pr', true);
    pr.configuration!.tsConfigPaths = [file('tsconfig.json')];
    const result = await analyze(pr);
    expect(result.files).toEqual({});
    expect(result.meta?.telemetry?.programCreation?.attempted).toBe(2);
    const selected = selection(pr).getRestoredSelections([file('cached.ts')])[0].program;
    expect(selected.kind === 'configured' && selected.tsconfig).toBe(child);
  });

  it('records added sources, deleted sources and updated compiler options from the current checkout', async () => {
    await analyze(request('branch'));
    fs.unlinkSync(file('changed.ts'));
    fs.writeFileSync(file('added.ts'), source);
    fs.writeFileSync(
      file('tsconfig.json'),
      JSON.stringify({
        files: ['cached.ts', 'added.ts', 'values.ts'],
        compilerOptions: { strict: true },
      }),
    );
    const pr = prRequest('pr', true);
    delete pr.files![file('changed.ts')];
    pr.files![file('added.ts')] = { fileStatus: FileStatus.FILE_STATUS_ADDED };
    const result = await analyze(pr);
    expect(Object.keys(result.files!)).toEqual([file('added.ts')]);
    expect(result.files![file('added.ts')].issues).toHaveLength(1);
    const metadata = selection(pr);
    expect(metadata.hasSelection(file('changed.ts'))).toBe(false);
    const selected = metadata.getRestoredSelections([file('cached.ts')])[0].program;
    expect(selected.kind).toBe('configured');
    expect(selected.compilerOptions.strict).toBe(true);
    fs.rmSync(project, { recursive: true });
    expect(
      (await replay(pr, file('added.ts'), source)).files![file('added.ts')].issues,
    ).toHaveLength(1);
  });
});
