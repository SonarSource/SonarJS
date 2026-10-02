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
  handleAnalyzeProjectRequest as handleRequest,
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
import { ProgramSelectionArchive } from '../../analysis/src/program-selection/archive.js';
import { toAnalyzeProjectUnaryResponse } from '../src/analyze-project-convert.js';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  deserializeProtobufDocument,
  serializeProtobufDocument,
} from '../../shared/src/fs-cache/archive-serialization.js';
import { isWindowsProjectPath, replayProjectRoot } from '../../shared/src/helpers/project-paths.js';

const workerData: WorkerData = { debugMemory: false };
// Simulate Java recording its raw request configuration, then the collector/hub handoff.
const collectedMetadata = new Map<string, string>();
async function handleAnalyzeProjectRequest(...args: Parameters<typeof handleRequest>) {
  const cache = args[0].type === 'on-analyze-project' ? args[0].data.filesystemCache : undefined;
  if (cache?.mode === 2 && cache.contextMetadata === undefined) {
    cache.contextMetadata = collectedMetadata.get(cache.analysisMetadataPath!);
  }
  if (cache?.mode === 1 && args[0].type === 'on-analyze-project') {
    collectedMetadata.set(
      cache.analysisMetadataPath!,
      JSON.stringify({ configuration: args[0].data.configuration }),
    );
  }
  return handleRequest(...args);
}
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
  for (const origin of ['C:/CI/Project', '//server/share/project', '/home/ci/project']) {
    for (const kind of ['configured', 'orphan', 'no-program']) {
      it(`replays ${kind} from ${origin} with native contents absent and submitted edits authoritative`, async () => {
        const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cross-platform-replay-'));
        const ci = path.join(temporary, 'ci');
        const physical = path.join(temporary, 'sqaa');
        const work = path.join(temporary, 'runtime');
        const relative = 'src/Main.test.ts';
        const typeAware = kind !== 'no-program';
        const original = typeAware
          ? "import { values } from '@shared/Values';\nvalues.sort();"
          : 'foo();;';
        const edited = typeAware
          ? "import { values } from '@shared/Values';\nvalues.sort((a, b) => a - b);"
          : 'foo();';
        fs.mkdirSync(path.join(ci, 'src'), { recursive: true });
        fs.mkdirSync(path.join(ci, 'shared'));
        fs.mkdirSync(physical);
        fs.mkdirSync(work);
        fs.writeFileSync(path.join(ci, relative), original);
        fs.writeFileSync(
          path.join(ci, 'shared/Values.ts'),
          'export const values: number[] = [80, 3, 9];',
        );
        if (kind === 'configured') {
          fs.writeFileSync(
            path.join(ci, 'tsconfig.json'),
            JSON.stringify({
              compilerOptions: { baseUrl: '.', paths: { '@shared/*': ['shared/*'] } },
              files: [relative],
            }),
          );
        }
        // Orphan programs must have type information even without imports or a tsconfig.
        const orphanOriginal = '[80, 3, 9].sort();';
        const orphanEdited = '[80, 3, 9].sort((a, b) => a - b);';
        const source = kind === 'orphan' ? orphanOriginal : original;
        fs.writeFileSync(path.join(ci, relative), source);
        const installation = installFsCache();
        (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = {
          ...installation,
          // Synthetic producers must preserve original names even on the Windows test host.
          // The fixture below chooses the producer's lookup semantics in the saved archive.
          beginAnalysis: (options: Parameters<typeof installation.beginAnalysis>[0]) =>
            installation.beginAnalysis({ ...options, caseSensitivePaths: true }),
        };
        const exists = mock.method(ts.sys, 'fileExists', (file: string) => {
          try {
            return fs.statSync(file).isFile();
          } catch {
            return false;
          }
        });
        const archivePath = path.join(work, 'fs.pb.gz');
        const analysisMetadataPath = path.join(work, 'metadata.pb.gz');
        const makeRequest = (
          baseDir: string,
          mode: number,
          fileContent: string,
          file = path.join(baseDir, relative),
        ): AnalyzeProjectRequest => ({
          configuration: {
            baseDir,
            canAccessFileSystem: true,
            sources: [path.join(ci, 'src')],
            inclusions: [`file:${normalizeToAbsolutePath(ci)}/src/**/*.ts`],
            createTsProgramForOrphanFiles: kind !== 'no-program',
          },
          files: { [file]: { fileType: FileType.FILE_TYPE_MAIN, fileContent } },
          rules: [
            {
              key: typeAware ? 'S2871' : 'S1116',
              configurations: [],
              fileTypeTargets: [FileType.FILE_TYPE_MAIN],
              language: JsTsLanguage.JS_TS_LANGUAGE_TS,
              analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
            },
          ],
          rulesWorkdir: work,
          filesystemCache: { archivePath, analysisMetadataPath, mode },
        });
        const analyze = async (input: AnalyzeProjectRequest, count: number) => {
          const responseKey = Object.keys(input.files!)[0];
          const result = await handleAnalyzeProjectRequest(
            { type: 'on-analyze-project', data: input },
            workerData,
          );
          expect(result.type).toBe('success');
          if (result.type !== 'success' || !result.result) {
            return;
          }
          const output = toAnalyzeProjectUnaryResponse(result.result.output, result.result.pathMap);
          expect(output.files![responseKey].issues).toHaveLength(count);
          expect(input.filesystemCache).toBeDefined();
        };
        try {
          await analyze(
            makeRequest(ci, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD, source),
            1,
          );
          const metadata = JSON.parse(collectedMetadata.get(analysisMetadataPath)!);
          metadata.configuration.baseDir = origin;
          // Convert native absolute scope values to the producer namespace. Archive keys and
          // program descriptors already use portable project-relative paths.
          const rewrite = (value: unknown): void => {
            if (value && typeof value === 'object') {
              for (const [key, item] of Object.entries(value)) {
                if (typeof item === 'string') {
                  (value as Record<string, unknown>)[key] = item
                    .replaceAll('\\', '/')
                    .replaceAll(normalizeToAbsolutePath(ci), origin);
                } else {
                  rewrite(item);
                }
              }
            }
          };
          rewrite(metadata.configuration);
          if (isWindowsProjectPath(origin)) {
            // Windows source roots may use a different spelling from the stored file names.
            const uppercaseScope = (value: unknown): void => {
              if (value && typeof value === 'object') {
                for (const [key, item] of Object.entries(value)) {
                  if (typeof item === 'string') {
                    (value as Record<string, unknown>)[key] = item.replace('/src', '/SRC');
                  } else {
                    uppercaseScope(item);
                  }
                }
              }
            };
            uppercaseScope(metadata.configuration);
          }
          collectedMetadata.set(analysisMetadataPath, JSON.stringify(metadata));
          const document = deserializeProtobufDocument(gunzipSync(fs.readFileSync(archivePath)));
          document.caseSensitivePaths = !isWindowsProjectPath(origin);
          fs.writeFileSync(archivePath, gzipSync(serializeProtobufDocument(document)));
          fs.rmSync(ci, { recursive: true });
          const metadataBefore = fs.readFileSync(analysisMetadataPath);
          const archiveBefore = fs.readFileSync(archivePath);
          for (const [contents, count] of [
            [source, 1],
            [kind === 'orphan' ? orphanEdited : edited, 0],
            ['', 0],
          ] as const) {
            const request = makeRequest(
              physical,
              FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
              contents,
            );
            await analyze(request, count);
            expect(request.configuration!.baseDir).toBe(
              replayProjectRoot(origin, normalizeToAbsolutePath(physical)),
            );
          }
          // Exercise the actual WebSensor shape: logical producer paths plus physical fallback.
          const logical = makeRequest(
            origin,
            FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
            source,
            `${origin}/${relative}`,
          );
          logical.filesystemCache!.fallbackBaseDir = physical;
          await analyze(logical, 1);
          if (isWindowsProjectPath(origin)) {
            const caseAlias = `${origin}/SRC/main.TEST.ts`;
            const caseContents =
              kind === 'configured' ? original.replace('@shared/Values', '@shared/VALUES') : source;
            const differentlyCased = makeRequest(
              origin,
              FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
              caseContents,
              caseAlias,
            );
            differentlyCased.filesystemCache!.fallbackBaseDir = physical;
            await analyze(differentlyCased, 1);
          }
          expect(fs.readFileSync(analysisMetadataPath)).toEqual(metadataBefore);
          expect(fs.readFileSync(archivePath)).toEqual(archiveBefore);
        } finally {
          exists.mock.restore();
        }
      });
    }
  }
  for (const scopeSettings of [
    { sources: ['src'], inclusions: ['**/*.ts'] },
    { sources: ['src'], tests: ['tests'] },
    { sources: ['src'], inclusions: ['**/*.ts'], absolute: true },
    { sources: ['src'], tests: ['tests'], absolute: true },
  ]) {
    it(`recomputes rule scope in the original CI namespace: ${JSON.stringify(scopeSettings)}`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-rule-scope-'));
      const recordRoot = path.join(temporary, 'ci');
      const replayRoot = path.join(temporary, 'sqaa');
      const rulesWorkdir = path.join(temporary, 'work');
      const relativePath = 'src/main.test.ts';
      const content = 'const value = { a: 1, a: 2 };';
      fs.mkdirSync(path.join(recordRoot, 'src'), { recursive: true });
      fs.mkdirSync(replayRoot);
      fs.mkdirSync(rulesWorkdir);
      fs.writeFileSync(path.join(recordRoot, relativePath), content);
      (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();
      const request = (
        baseDir: string,
        mode: analyzeProjectProto.analyzeproject.v1.FilesystemCacheMode,
      ): AnalyzeProjectRequest => ({
        configuration: { baseDir, canAccessFileSystem: true, disableTypeChecking: true },
        files: {
          [path.join(baseDir, relativePath)]: {
            fileContent: content,
            fileType: FileType.FILE_TYPE_MAIN,
          },
        },
        rules: [
          {
            key: 'S1534',
            configurations: [],
            fileTypeTargets: [FileType.FILE_TYPE_MAIN],
            language: JsTsLanguage.JS_TS_LANGUAGE_TS,
            analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
          },
        ],
        rulesWorkdir,
        filesystemCache: {
          mode,
          archivePath: path.join(rulesWorkdir, 'fs.pb.gz'),
          analysisMetadataPath: path.join(rulesWorkdir, 'metadata.pb.gz'),
        },
      });
      const analyze = async (input: AnalyzeProjectRequest, count: number) => {
        const submittedPath = Object.keys(input.files!)[0];
        const result = await handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: input },
          workerData,
        );
        expect(result).toMatchObject({
          type: 'success',
          result: {
            output: {
              files: {
                [normalizeToAbsolutePath(path.join(input.configuration!.baseDir!, relativePath))]: {
                  issues: count ? [expect.objectContaining({ ruleId: 'S1534' })] : [],
                },
              },
            },
          },
        });
        if (result.type === 'success' && result.result) {
          const wireResponse = toAnalyzeProjectUnaryResponse(
            result.result.output,
            result.result.pathMap,
          );
          expect(wireResponse.files![submittedPath]).toBeDefined();
        }
      };
      const recorded = request(recordRoot, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD);
      const recordedScope = {
        sources: scopeSettings.sources.map(value =>
          scopeSettings.absolute ? path.join(recordRoot, value) : value,
        ),
        tests: scopeSettings.tests?.map(value =>
          scopeSettings.absolute ? path.join(recordRoot, value) : value,
        ),
        inclusions: scopeSettings.inclusions?.map(value =>
          scopeSettings.absolute ? `${recordRoot}/${value}` : value,
        ),
      };
      Object.assign(recorded.configuration!, recordedScope);
      await analyze(recorded, 1);
      // Replay must work even though the original CI directory no longer exists natively.
      fs.rmSync(recordRoot, { recursive: true });
      const replayed = request(replayRoot, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY);
      await analyze(replayed, 1);
      expect(replayed.configuration!.baseDir).toBe(normalizeToAbsolutePath(recordRoot));
      expect(replayed.configuration!.sources).toEqual(recordedScope.sources);
      const changedScope = request(replayRoot, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY);
      changedScope.files![path.join(replayRoot, relativePath)].fileType = FileType.FILE_TYPE_TEST;
      await analyze(changedScope, 0);
      const withoutContext = request(replayRoot, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY);
      withoutContext.filesystemCache = undefined;
      await analyze(withoutContext, 0);
      // A scope entry is not a portable TS-program outcome. If restoration falls back,
      // it must also discard this recorded classification and use normal request behavior.
      const unsupportedMetadata = new ProgramSelectionArchive(
        path.join(rulesWorkdir, 'metadata.pb.gz'),
        normalizeToAbsolutePath(recordRoot),
        'record',
      );
      unsupportedMetadata.end();
      collectedMetadata.set(
        path.join(rulesWorkdir, 'metadata.pb.gz'),
        JSON.stringify({ configuration: { baseDir: recordRoot, disableTypeChecking: false } }),
      );
      const unsupported = request(replayRoot, FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY);
      await analyze(unsupported, 0);
      expect(unsupported.filesystemCache).toBeUndefined();
      const logicalUnsupported = request(
        recordRoot,
        FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY,
      );
      logicalUnsupported.filesystemCache!.fallbackBaseDir = replayRoot;
      await analyze(logicalUnsupported, 0);
      expect(logicalUnsupported.configuration!.baseDir).toBe(normalizeToAbsolutePath(replayRoot));
    });
  }

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

  for (const programKind of ['configured', 'orphan', 'monorepo']) {
    it(`prefers submitted edits over CI content in a restored ${programKind} program`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-content-precedence-'));
      const baseDir = path.join(temporary, 'sources');
      const rulesWorkdir = path.join(temporary, 'work');
      const filePath = path.join(baseDir, 'existing.ts');
      const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
      const analysisMetadataPath = path.join(rulesWorkdir, 'analysis-metadata.pb.gz');
      const expression = programKind === 'monorepo' ? 'values' : '[80, 3, 9]';
      const imports =
        programKind === 'monorepo' ? 'import { values } from "@shared/values";\n' : '';
      const original = `${imports}${expression}.sort();`;
      const edited = `${imports}${expression}.sort((a, b) => a - b);`;
      fs.mkdirSync(baseDir);
      fs.mkdirSync(rulesWorkdir);
      fs.writeFileSync(filePath, original);
      if (programKind === 'monorepo') {
        fs.mkdirSync(path.join(baseDir, 'shared'));
        fs.writeFileSync(
          path.join(baseDir, 'shared/values.ts'),
          'export const values: number[] = [80, 3, 9];',
        );
        // Project references consume the declaration output of the referenced build.
        fs.writeFileSync(
          path.join(baseDir, 'shared/values.d.ts'),
          'export declare const values: number[];',
        );
        fs.writeFileSync(
          path.join(baseDir, 'tsconfig.base.json'),
          JSON.stringify({
            compilerOptions: { baseUrl: '.', paths: { '@shared/*': ['shared/*'] } },
          }),
        );
        fs.writeFileSync(
          path.join(baseDir, 'shared/tsconfig.json'),
          JSON.stringify({
            extends: '../tsconfig.base.json',
            compilerOptions: { composite: true },
            files: ['values.ts'],
          }),
        );
        fs.writeFileSync(
          path.join(baseDir, 'tsconfig.json'),
          JSON.stringify({
            extends: './tsconfig.base.json',
            files: ['existing.ts'],
            references: [{ path: './shared' }],
          }),
        );
      } else if (programKind === 'configured') {
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

  for (const scenario of [
    {
      name: 'HTML JavaScript and CSS',
      filename: 'input.html',
      original: '<script>if (foo()) bar(); else baz();</script>\n<style>a { color: red; }</style>',
      edited: '<script>if (foo()) bar(); else bar();</script>\n<style>a { color: red;; }</style>',
      rule: 'S3923',
      css: true,
    },
    {
      name: 'Vue JavaScript',
      filename: 'input.vue',
      original: '<script>if (foo()) bar(); else baz();</script>',
      edited: '<script>if (foo()) bar(); else bar();</script>',
      rule: 'S3923',
    },
    {
      name: 'YAML JavaScript',
      filename: 'input.yaml',
      original:
        'Transform: AWS::Serverless-2016-10-31\nResources:\n  Lambda:\n    Type: AWS::Lambda::Function\n    Properties:\n      Runtime: nodejs16.0\n      Code:\n        ZipFile: if (foo()) bar(); else baz();',
      edited:
        'Transform: AWS::Serverless-2016-10-31\nResources:\n  Lambda:\n    Type: AWS::Lambda::Function\n    Properties:\n      Runtime: nodejs16.0\n      Code:\n        ZipFile: if (foo()) bar(); else bar();',
      rule: 'S3923',
    },
    {
      name: 'explicit no-program TypeScript',
      filename: 'input.ts',
      original: 'foo();',
      edited: 'foo();;',
      rule: 'S1116',
      noProgram: true,
    },
  ]) {
    it(`analyzes submitted edits in restored ${scenario.name}`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'embedded-replay-edit-'));
      const baseDir = path.join(temporary, 'sources');
      const rulesWorkdir = path.join(temporary, 'work');
      const filePath = path.join(baseDir, scenario.filename);
      fs.mkdirSync(baseDir);
      fs.mkdirSync(rulesWorkdir);
      fs.writeFileSync(filePath, scenario.original);
      (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();
      const request = (
        mode: analyzeProjectProto.analyzeproject.v1.FilesystemCacheMode,
        fileContent?: string,
      ): AnalyzeProjectRequest => ({
        configuration: { baseDir, createTsProgramForOrphanFiles: !scenario.noProgram },
        files: {
          [filePath]: {
            ...(fileContent === undefined ? {} : { fileContent }),
            fileType: FileType.FILE_TYPE_MAIN,
          },
        },
        rules: [
          {
            key: scenario.rule,
            configurations: [],
            fileTypeTargets: [FileType.FILE_TYPE_MAIN],
            language: scenario.noProgram
              ? JsTsLanguage.JS_TS_LANGUAGE_TS
              : JsTsLanguage.JS_TS_LANGUAGE_JS,
            analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
          },
        ],
        cssRules: scenario.css
          ? [{ key: '@stylistic/no-extra-semicolons', configurations: [] }]
          : [],
        bundles: [],
        rulesWorkdir,
        filesystemCache: {
          archivePath: path.join(rulesWorkdir, 'filesystem.pb.gz'),
          analysisMetadataPath: path.join(rulesWorkdir, 'metadata.pb.gz'),
          mode,
        },
      });
      const analyze = async (input: AnalyzeProjectRequest) => {
        const result = await handleAnalyzeProjectRequest(
          { type: 'on-analyze-project', data: input },
          workerData,
        );
        expect(result.type).toBe('success');
        if (result.type !== 'success' || !result.result) throw new Error('Analysis failed');
        const file = result.result.output.files[normalizeToAbsolutePath(filePath)];
        expect(file && 'issues' in file).toBe(true);
        expect(input.filesystemCache).toBeDefined();
        if (scenario.noProgram) {
          expect(result.result.output.meta.telemetry?.programCreation.succeeded).toBe(0);
        }
        return file && 'issues' in file ? file.issues : [];
      };
      try {
        expect(await analyze(request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD))).toEqual(
          [],
        );
        fs.writeFileSync(filePath, scenario.edited);
        expect(await analyze(request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY))).toEqual(
          [],
        );
        const issues = await analyze(
          request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY, scenario.edited),
        );
        expect(issues).toEqual(
          expect.arrayContaining([expect.objectContaining({ ruleId: scenario.rule })]),
        );
        if (scenario.css)
          expect(issues).toEqual(
            expect.arrayContaining([
              expect.objectContaining({ ruleId: '@stylistic/no-extra-semicolons' }),
            ]),
          );
      } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
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
                [normalizeToAbsolutePath(path.join(recordRoot, relativePath))]: {
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
            [normalizeToAbsolutePath(path.join(recordRoot, 'component.ts'))]: {
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
        restrictNativeReads: false,
        passthroughDirs: [
          path.dirname(ts.getDefaultLibFilePath({})),
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

  for (const corrupted of ['filesystem', 'metadata']) {
    it(`classifies corrupt ${corrupted} context and recovers in the same worker`, async () => {
      const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'corrupt-replay-context-'));
      const baseDir = path.join(temporary, 'sources');
      const rulesWorkdir = path.join(temporary, 'work');
      fs.mkdirSync(baseDir);
      fs.mkdirSync(rulesWorkdir);
      const filePath = path.join(baseDir, 'input.ts');
      fs.writeFileSync(filePath, '[80, 3, 9].sort();');
      const archivePath = path.join(rulesWorkdir, 'filesystem.pb.gz');
      const analysisMetadataPath = path.join(rulesWorkdir, 'metadata.pb.gz');
      const request = (
        mode: analyzeProjectProto.analyzeproject.v1.FilesystemCacheMode,
      ): AnalyzeProjectRequest => ({
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
        bundles: [],
        rulesWorkdir,
        filesystemCache: { archivePath, analysisMetadataPath, mode },
      });
      (globalThis as Record<symbol, unknown>)[FS_CACHE_INSTALLATION] = installFsCache();
      expect(
        await handleAnalyzeProjectRequest(
          {
            type: 'on-analyze-project',
            data: request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_RECORD),
          },
          workerData,
        ),
      ).toMatchObject({ type: 'success' });
      const corruptedPath = corrupted === 'filesystem' ? archivePath : analysisMetadataPath;
      const validBytes = fs.readFileSync(corruptedPath);
      fs.writeFileSync(corruptedPath, 'not a compressed context archive');
      try {
        const result = await handleAnalyzeProjectRequest(
          {
            type: 'on-analyze-project',
            data: request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY),
          },
          workerData,
        );
        expect(result).toMatchObject({
          type: 'failure',
          reason: 'invalid_request',
          error: { message: expect.stringContaining('Invalid restored JavaScript context') },
        });
        // Restoring the original bytes must allow another context-backed request in this worker.
        fs.writeFileSync(corruptedPath, validBytes);
        const recovered = await handleAnalyzeProjectRequest(
          {
            type: 'on-analyze-project',
            data: request(FilesystemCacheMode.FILESYSTEM_CACHE_MODE_REPLAY),
          },
          workerData,
        );
        expect(recovered).toMatchObject({
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
      } finally {
        fs.rmSync(temporary, { recursive: true, force: true });
      }
    });
  }

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
