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
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'expect';
import {
  InvalidAnalyzeProjectRequestError,
  normalizeAnalyzeProjectRequest,
} from '../src/analyze-project-normalize.js';
import {
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../shared/src/helpers/files.js';
import { sonarjs } from '../src/proto/analyze-project.js';

const { AnalysisMode, FileStatus, FileType, JsTsLanguage } = sonarjs.analyzeproject.v1;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(path => rm(path, { force: true, recursive: true })),
  );
});

async function createBaseDir() {
  const baseDir = await mkdtemp(join(tmpdir(), 'sonarjs-grpc-normalize-'));
  temporaryDirectories.push(baseDir);
  await mkdir(join(baseDir, 'src'), { recursive: true });
  return normalizeToAbsolutePath(baseDir, baseDir as NormalizedAbsolutePath);
}

function stringList(values: string[]) {
  return { values };
}

describe('normalizeAnalyzeProjectRequest', () => {
  it('should normalize explicit files, paths, rules and protobuf values', async () => {
    const baseDir = await createBaseDir();
    const mainFile = join(baseDir, 'src', 'main.ts');
    const testFile = join(baseDir, 'src', 'main.test.ts');

    const normalized = await normalizeAnalyzeProjectRequest({
      configuration: {
        baseDir,
        sonarlint: false,
        fsEvents: [join(baseDir, 'src', 'created.ts')],
        allowTsParserJsFiles: true,
        analysisMode: AnalysisMode.ANALYSIS_MODE_DEFAULT,
        skipAst: false,
        ignoreHeaderComments: false,
        maxFileSize: { high: 1, low: 1, unsigned: false } as never,
        environments: stringList(['browser']),
        globals: stringList(['window']),
        tsSuffixes: stringList(['.ts']),
        jsSuffixes: stringList(['.js']),
        cssSuffixes: stringList(['.css']),
        htmlSuffixes: stringList(['.html']),
        yamlSuffixes: stringList(['.yaml']),
        cssAdditionalSuffixes: stringList(['.scss']),
        tsConfigPaths: ['tsconfig.json'],
        jsTsExclusions: stringList(['generated/**']),
        sources: ['src'],
        inclusions: ['**/*.ts'],
        exclusions: ['**/*.gen.ts'],
        tests: ['tests'],
        testInclusions: ['**/*.spec.ts'],
        testExclusions: ['**/*.snap.ts'],
        detectBundles: false,
        canAccessFileSystem: false,
        createTsProgramForOrphanFiles: false,
        disableTypeChecking: true,
        skipNodeModuleLookupOutsideBaseDir: true,
        ecmaScriptVersion: '2024',
        clearDependenciesCache: true,
        clearTsConfigCache: true,
        reportNclocForTestFiles: true,
      },
      files: {
        [mainFile]: {
          fileContent: 'export const answer = 42;',
          fileType: FileType.FILE_TYPE_MAIN,
          fileStatus: FileStatus.FILE_STATUS_ADDED,
        },
        [testFile]: {
          fileContent: 'it("works", () => true);',
          fileType: FileType.FILE_TYPE_TEST,
          fileStatus: FileStatus.FILE_STATUS_CHANGED,
        },
      },
      rules: [
        {
          key: 'S1116',
          language: JsTsLanguage.JS_TS_LANGUAGE_TS,
          configurations: [
            { numberValue: 3 },
            { stringValue: 'strict' },
            { boolValue: false },
            { nullValue: 0 },
            {
              structValue: {
                fields: {
                  nested: {
                    listValue: {
                      values: [{ boolValue: true }, { stringValue: 'value' }],
                    },
                  },
                },
              },
            },
          ],
          fileTypeTargets: [FileType.FILE_TYPE_MAIN, FileType.FILE_TYPE_TEST],
          analysisModes: [
            AnalysisMode.ANALYSIS_MODE_DEFAULT,
            AnalysisMode.ANALYSIS_MODE_SKIP_UNCHANGED,
          ],
          blacklistedExtensions: ['.gen.ts'],
        },
        {
          key: 'S1128',
          language: JsTsLanguage.JS_TS_LANGUAGE_JS,
          configurations: [],
          fileTypeTargets: [FileType.FILE_TYPE_MAIN],
          analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
        },
      ],
      cssRules: [
        {
          key: 'css-rule',
          configurations: [{ structValue: { fields: { enabled: { boolValue: true } } } }],
        },
      ],
      bundles: ['bundles/rule.mjs'],
      rulesWorkdir: 'rules',
    });

    expect(normalized.baseDir).toBe(baseDir);
    expect(normalized.bundles).toEqual([normalizeToAbsolutePath('bundles/rule.mjs', baseDir)]);
    expect(normalized.rulesWorkdir).toBe(normalizeToAbsolutePath('rules', baseDir));
    expect(normalized.pathMap.size).toBe(2);
    expect(normalized.configuration.maxFileSize).toBe(0x100000000 + 1);
    expect(normalized.configuration.fsEvents).toEqual([
      normalizeToAbsolutePath(join(baseDir, 'src', 'created.ts'), baseDir),
    ]);
    expect(normalized.configuration.tsConfigPaths).toEqual([
      normalizeToAbsolutePath('tsconfig.json', baseDir),
    ]);
    expect(normalized.configuration.sources).toEqual([normalizeToAbsolutePath('src', baseDir)]);
    expect(normalized.configuration.tests).toEqual([normalizeToAbsolutePath('tests', baseDir)]);
    expect(normalized.configuration.analysisMode).toBe('DEFAULT');
    expect(normalized.configuration.canAccessFileSystem).toBe(false);
    expect(normalized.configuration.clearDependenciesCache).toBe(true);
    expect(normalized.configuration.clearTsConfigCache).toBe(true);
    expect(normalized.configuration.ecmaScriptVersion).toBe('2024');
    expect(normalized.configuration.reportNclocForTestFiles).toBe(true);
    expect(normalized.rules).toHaveLength(2);
    expect(normalized.rules[0]).toMatchObject({
      key: 'S1116',
      language: 'ts',
      fileTypeTargets: ['MAIN', 'TEST'],
      analysisModes: ['DEFAULT', 'SKIP_UNCHANGED'],
      blacklistedExtensions: ['.gen.ts'],
    });
    expect(normalized.rules[0].configurations).toEqual([
      3,
      'strict',
      false,
      null,
      { nested: [true, 'value'] },
    ]);
    expect(normalized.rules[1].language).toBe('js');
    expect(normalized.cssRules).toEqual([{ key: 'css-rule', configurations: [{ enabled: true }] }]);
  });

  it('should allow filesystem discovery when files are omitted', async () => {
    const baseDir = await createBaseDir();

    const normalized = await normalizeAnalyzeProjectRequest({
      configuration: {
        baseDir,
        canAccessFileSystem: true,
        maxFileSize: { toNumber: () => 64 } as never,
      },
      rules: [],
      cssRules: [],
      bundles: [],
    });

    expect(normalized.baseDir).toBe(baseDir);
    expect(normalized.pathMap.size).toBe(0);
    expect(normalized.configuration.canAccessFileSystem).toBe(true);
    expect(normalized.configuration.maxFileSize).toBe(64);
  });

  it('should keep empty files explicit when filesystem access is disabled', async () => {
    const baseDir = await createBaseDir();

    const normalized = await normalizeAnalyzeProjectRequest({
      configuration: {
        baseDir,
        canAccessFileSystem: false,
      },
      files: {},
      rules: [],
      cssRules: [],
      bundles: [],
    });

    expect(normalized.pathMap.size).toBe(0);
    expect(normalized.configuration.canAccessFileSystem).toBe(false);
  });

  it('should reject malformed requests', async () => {
    const baseDir = await createBaseDir();

    const invalidRequests: Array<{ request: unknown; message: string }> = [
      {
        request: {
          configuration: undefined,
          rules: [],
          cssRules: [],
          bundles: [],
        },
        message: 'configuration.base_dir is required',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {
            '': {
              fileContent: 'x',
              fileType: FileType.FILE_TYPE_MAIN,
            },
          },
          rules: [],
          cssRules: [],
          bundles: [],
        },
        message: 'files contains an empty file path',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {},
          rules: [{ key: 'S1116', configurations: [], fileTypeTargets: [], analysisModes: [] }],
          cssRules: [],
          bundles: [],
        },
        message: 'rules[0].language is required',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {},
          rules: [
            {
              key: 'S1116',
              language: JsTsLanguage.JS_TS_LANGUAGE_JS,
              configurations: [],
              fileTypeTargets: [FileType.FILE_TYPE_UNSPECIFIED],
              analysisModes: [AnalysisMode.ANALYSIS_MODE_DEFAULT],
            },
          ],
          cssRules: [],
          bundles: [],
        },
        message: 'rules[0].file_type_targets[0] must not be unspecified',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {},
          rules: [
            {
              key: 'S1116',
              language: JsTsLanguage.JS_TS_LANGUAGE_JS,
              configurations: [],
              fileTypeTargets: [FileType.FILE_TYPE_MAIN],
              analysisModes: [AnalysisMode.ANALYSIS_MODE_UNSPECIFIED],
            },
          ],
          cssRules: [],
          bundles: [],
        },
        message: 'rules[0].analysis_modes[0] must not be unspecified',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false, maxFileSize: 'NaN' },
          files: {},
          rules: [],
          cssRules: [],
          bundles: [],
        },
        message: 'configuration.max_file_size must be a safe integer',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {
            [join(baseDir, 'src', 'invalid.ts')]: {
              fileType: 999,
            },
          },
          rules: [],
          cssRules: [],
          bundles: [],
        },
        message: 'Invalid file type: 999',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {
            [join(baseDir, 'src', 'invalid.ts')]: {
              fileType: FileType.FILE_TYPE_MAIN,
              fileStatus: 999,
              fileContent: 'x',
            },
          },
          rules: [],
          cssRules: [],
          bundles: [],
        },
        message: 'Invalid file status: 999',
      },
      {
        request: {
          configuration: { baseDir, canAccessFileSystem: false },
          files: {},
          rules: [],
          cssRules: [{ configurations: [] }],
          bundles: [],
        },
        message: 'css_rules[0].key is required',
      },
    ];

    for (const { message, request } of invalidRequests) {
      await expect(
        normalizeAnalyzeProjectRequest(request as sonarjs.analyzeproject.v1.IAnalyzeProjectRequest),
      ).rejects.toThrow(InvalidAnalyzeProjectRequestError);
      await expect(
        normalizeAnalyzeProjectRequest(request as sonarjs.analyzeproject.v1.IAnalyzeProjectRequest),
      ).rejects.toThrow(message);
    }
  });
});
