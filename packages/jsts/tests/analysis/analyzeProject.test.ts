/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { toUnixPath } from '../../src/rules/helpers/index.js';
import { describe, it, beforeEach, type Mock, mock } from 'node:test';
import { expect } from 'expect';
import { RuleConfig } from '../../src/linter/config/rule-config.js';
import {
  JsTsFiles,
  ProjectAnalysisInput,
} from '../../src/analysis/projectAnalysis/projectAnalysis.js';
import {
  analyzeProject,
  cancelAnalysis,
} from '../../src/analysis/projectAnalysis/analyzeProject.js';
import { findFiles } from '../../../shared/src/helpers/find-files.js';
import { join, extname } from 'node:path/posix';
import { ErrorCode } from '../../../shared/src/errors/error.js';
import {
  sourceFileStore,
  tsConfigStore,
} from '../../src/analysis/projectAnalysis/file-stores/index.js';
import ts from 'typescript';
import { setGlobalConfiguration } from '../../../shared/src/helpers/configuration.js';
import assert from 'node:assert';

const fixtures = toUnixPath(join(import.meta.dirname, 'fixtures'));

describe('analyzeProject', () => {
  beforeEach(() => {
    tsConfigStore.clearTsConfigCache();
    sourceFileStore.clearCache();
  });

  it('should analyze the whole project with program', async () => {
    console.log = mock.fn(console.log);
    const files: JsTsFiles = {};
    setGlobalConfiguration({ baseDir: fixtures });
    await findFiles(fixtures, async file => {
      const filePath = toUnixPath(join(file.parentPath, file.name));
      if (['.js', '.ts'].includes(extname(file.name).toLowerCase())) {
        files[filePath] = {
          filePath,
          fileType: 'MAIN',
        };
      }
    });
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;
    const result = await analyzeProject(prepareInput(fixtures, files));
    assert(consoleLogMock.calls.some(call => call.arguments[0] === 'Creating TypeScript program'));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(join(fixtures, 'parsing-error.js'))]).toMatchObject({
      parsingError: {
        code: ErrorCode.Parsing,
        message: 'Unexpected token (3:0)',
        line: 3,
      },
    });
  });

  it('should analyze the whole project with watch program', async () => {
    const baseDir = join(fixtures, 'with-parsing-error');
    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;
    const result = await analyzeProject(prepareInput(baseDir, undefined, true));
    assert(!consoleLogMock.calls.some(call => call.arguments[0] === 'Creating TypeScript program'));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(join(baseDir, 'parsing-error.js'))]).toMatchObject({
      parsingError: {
        code: ErrorCode.Parsing,
        message: 'Unexpected token (3:0)',
        line: 3,
      },
    });
  });

  it('should cancel analysis in sonarlint', async () => {
    const baseDir = join(fixtures, 'with-parsing-error');
    const analysisPromise = analyzeProject(prepareInput(baseDir, undefined, true), message => {
      expect(message).toEqual({ messageType: 'cancelled' });
    });
    cancelAnalysis();
    await analysisPromise;
  });

  it('should cancel analysis in sonarqube', async () => {
    const baseDir = join(fixtures, 'with-parsing-error');
    const analysisPromise = analyzeProject(prepareInput(baseDir), message => {
      expect(message).toEqual({ messageType: 'cancelled' });
    });
    cancelAnalysis();
    await analysisPromise;
  });

  it('should not touch FS during analysis', async t => {
    const fsSpy = t.mock.module('node:fs/promises', { cache: true }) as any;
    const baseDir = '/path/does/not/exist';
    const filePath = join(baseDir, 'whatever_file.ts');
    await analyzeProject({
      rules: defaultRules,
      files: {
        [filePath]: {
          fileType: 'MAIN',
          filePath,
          fileContent: 'if (1 == 1) {console.log(1)}',
        },
      },
      configuration: {
        noFs: true,
        baseDir,
      },
    });
    expect(fsSpy.accessCount).toBeUndefined();
  });

  it('should return a default result when the project is empty', async () => {
    const baseDir = join(fixtures, 'empty-folder');
    const result = await analyzeProject(prepareInput(baseDir, {}));
    expect(result).toEqual({
      files: {},
      meta: {
        warnings: [],
      },
    });
  });

  it('should handle references in tsconfig.json', async () => {
    const baseDir = join(fixtures, 'referenced-tsconfigs');
    const result = await analyzeProject({
      rules: defaultRules,
      configuration: { baseDir },
    });
    expect(Object.keys(result.files)).toEqual(
      expect.arrayContaining([
        toUnixPath(join(baseDir, 'dir/file.ts')),
        toUnixPath(join(baseDir, 'file.ts')),
      ]),
    );
  });

  it('should handle handle program creation with grace', async () => {
    const baseDir = join(fixtures, 'simple-tsconfig');
    const result = await analyzeProject({
      configuration: { baseDir },
      rules: defaultRules,
    });
    expect(result.meta.warnings.length).toEqual(1);
    const resultWarning = result.meta.warnings.at(0);
    expect(resultWarning).toEqual(
      `Failed to create TypeScript program with TSConfig file ${join(baseDir, 'tsconfig.json')}. Highest TypeScript supported version is ${ts.version}`,
    );
  });

  it('should handle add warning on missing tsconfig', async () => {
    const baseDir = join(fixtures, 'tsconfig-with-extends-missing');
    const result = await analyzeProject({
      configuration: { baseDir },
      rules: defaultRules,
    });
    expect(result.meta.warnings.length).toEqual(1);
    const resultWarning = result.meta.warnings.at(0);
    expect(resultWarning).toEqual(
      "At least one referenced/extended tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.",
    );
  });

  it('should handle error from tsconfig in sonarlint context', async () => {
    console.log = mock.fn(console.log);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;
    const baseDir = join(fixtures, 'tsconfig-no-files');
    await analyzeProject({
      configuration: { baseDir, sonarlint: true },
      rules: defaultRules,
    });
    assert(
      consoleLogMock.calls.some(call =>
        (call.arguments[0] as string).startsWith(
          `Failed to analyze TSConfig ${join(baseDir, 'tsconfig.json')}`,
        ),
      ),
    );
  });
});

const defaultRules: RuleConfig[] = [
  {
    key: 'S4621',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S1116',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S1192',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S6326',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S4524',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S4798',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S1534',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S3003',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S4634',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S1321',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S3696',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S3498',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S3512',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S4335',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S2870',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S3403',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S1314',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S3514',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
  {
    key: 'S1172',
    configurations: [],
    fileTypeTargets: ['MAIN'],
    language: 'js',
    analysisModes: ['DEFAULT'],
  },
];

function prepareInput(baseDir: string, files?: JsTsFiles, sonarlint = false): ProjectAnalysisInput {
  return {
    rules: defaultRules,
    files,
    configuration: {
      sonarlint,
      baseDir,
    },
  };
}
