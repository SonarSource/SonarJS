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
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';
import { RuleConfig } from '../../src/linter/config/rule-config.js';
import {
  JsTsFiles,
  ProjectAnalysisInput,
} from '../../src/analysis/projectAnalysis/projectAnalysis.js';
import {
  analyzeProject,
  loadFiles,
  verifyProvidedTsConfigs,
} from '../../src/analysis/projectAnalysis/projectAnalyzer.js';
import { findFiles } from '../../../shared/src/helpers/find-files.js';
import { join, relative, extname, basename } from 'node:path/posix';
import {
  clearTSConfigs,
  getTSConfigs,
  getTSConfigsCount,
  getTSConfigsIterator,
  writeTSConfigFile,
} from '../../src/analysis/projectAnalysis/tsconfigs.js';
import fs from 'fs';
import { readFile } from 'node:fs/promises';

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

function prepareInput(files?: JsTsFiles, sonarlint = false): ProjectAnalysisInput {
  return {
    rules: defaultRules,
    baseDir: fixtures,
    files,
    sonarlint,
  };
}

const fixtures = join(import.meta.dirname, 'fixtures');

describe('analyzeProject', () => {
  beforeEach(() => {
    clearTSConfigs();
  });

  it('should analyze the whole project with program', async () => {
    const files: JsTsFiles = {};
    await findFiles(fixtures, async file => {
      const filePath = toUnixPath(join(file.parentPath, file.name));
      if (['.js', '.ts'].includes(extname(file.name).toLowerCase())) {
        files[filePath] = {
          filePath,
          fileType: 'MAIN',
        };
      }
    });
    const result = await analyzeProject(prepareInput(files));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(join(fixtures, 'parsing-error.js'))]).toMatchObject({
      ruleId: 'S2260',
      message: 'Unexpected token (3:0)',
      line: 3,
      language: 'js',
    });
    expect(result.meta.withWatchProgram).toBeFalsy();
    expect(result.meta.withProgram).toBeTruthy();
    expect(result.meta.programsCreated.length).toEqual(3);
  });

  it('should analyze the whole project with watch program', async () => {
    const result = await analyzeProject(prepareInput(undefined, true));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(join(fixtures, 'parsing-error.js'))]).toMatchObject({
      ruleId: 'S2260',
      message: 'Unexpected token (3:0)',
      line: 3,
      language: 'js',
    });
    expect(result.meta.withWatchProgram).toBeTruthy();
    expect(result.meta.withProgram).toBeFalsy();
    expect(result.meta.programsCreated.length).toEqual(0);
  });

  it('should return a default result when the project is empty', async () => {
    const result = await analyzeProject(prepareInput({}));
    expect(result).toEqual(
      expect.objectContaining({
        files: {},
        meta: expect.objectContaining({}),
      }),
    );
  });
});

describe('tsconfigs', () => {
  it('should return the TSconfig files', async () => {
    clearTSConfigs();
    await loadFiles(fixtures, {});
    expect(getTSConfigsCount()).toEqual(3);
  });

  it('should validate the provided TSconfig files', async () => {
    const tsconfigs = getTSConfigs();
    clearTSConfigs();
    await verifyProvidedTsConfigs(
      fixtures,
      tsconfigs.map(tsconfig => relative(fixtures, tsconfig)).concat('fake_dir/tsconfig.json'),
    );
    expect(getTSConfigsCount()).toEqual(3);
  });

  it('should write tsconfig file', async () => {
    const { filename } = await writeTSConfigFile({
      compilerOptions: { allowJs: true, noImplicitAny: true },
      include: ['/path/to/project/**/*'],
    });
    const content = fs.readFileSync(filename, { encoding: 'utf-8' });
    expect(content).toBe(
      '{"compilerOptions":{"allowJs":true,"noImplicitAny":true},"include":["/path/to/project/**/*"]}',
    );
  });

  it('when no tsconfigs, in SonarLint should generate tsconfig with wildcard', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'module'));
    const files = await loadFiles(baseDir, {});
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, true, 200);
    const tsconfig = await getAsyncIteratorValue(tsconfigs);
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      include: [`${baseDir}/**/*`],
    });
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });

  it('when no tsconfigs, in SonarQube should generate tsconfig with all files', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'module'));
    const files = await loadFiles(baseDir, {});
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, false, 200);
    const tsconfig = await getAsyncIteratorValue(tsconfigs);
    expect(basename(tsconfig)).toMatch(/tsconfig-\w{6}\.json/);
    expect(JSON.parse(await readFile(tsconfig, 'utf8'))).toMatchObject({
      compilerOptions: {
        allowJs: true,
        noImplicitAny: true,
      },
      files: [`${baseDir}/file.ts`, `${baseDir}/string42.ts`],
    });
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });

  it('should not generate tsconfig file when too many files', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'module'));
    const files = await loadFiles(baseDir, {});
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, true, 1);
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });

  it('should not generate tsconfig file if there is already at least one', async () => {
    clearTSConfigs();
    const baseDir = toUnixPath(join(fixtures, 'paths'));
    const files = await loadFiles(baseDir, {});
    const tsconfigs = getTSConfigsIterator(Object.keys(files), baseDir, true, 1);
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(
      toUnixPath(join(baseDir, 'tsconfig.json')),
    );
    expect(await getAsyncIteratorValue(tsconfigs)).toEqual(undefined);
  });
});

async function getAsyncIteratorValue(iterator: AsyncIterableIterator<string>) {
  return await iterator.next().then(({ value }) => value);
}
