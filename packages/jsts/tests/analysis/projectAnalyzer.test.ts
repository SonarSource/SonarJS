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
import path from 'path';
import { searchFiles, File, toUnixPath } from '../../src/rules/helpers/index.js';
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';
import { RuleConfig } from '../../src/linter/config/rule-config.js';
import { ProjectAnalysisInput } from '../../src/analysis/projectAnalysis/projectAnalysis.js';
import { clearTSConfigs } from '../../src/program/tsconfigs/index.js';
import { analyzeProject } from '../../src/analysis/projectAnalysis/projectAnalyzer.js';

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

function filesDBtoFilesInput(filesDB: Record<string, File<void>[]>) {
  const allFiles = {};
  Object.values(filesDB).forEach(files => {
    files.forEach(file => {
      allFiles[file.filename] = {
        fileType: 'MAIN',
        filePath: file.filename,
      };
    });
  });
  return allFiles;
}

function prepareInput(
  files: Record<string, File<void>[]>,
  sonarlint = false,
): ProjectAnalysisInput {
  return {
    rules: defaultRules,
    baseDir: fixtures,
    files: filesDBtoFilesInput(files),
    sonarlint,
  };
}

const fixtures = path.join(import.meta.dirname, 'fixtures');

describe('analyzeProject', () => {
  beforeEach(() => {
    clearTSConfigs();
  });

  it('should analyze the whole project with program', async () => {
    const { files } = searchFiles(fixtures, { files: { pattern: '*.js,*.ts' } }, []);
    const result = await analyzeProject(prepareInput(files as Record<string, File<void>[]>));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(path.join(fixtures, 'parsing-error.js'))]).toMatchObject({
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
    const { files } = searchFiles(fixtures, { files: { pattern: '*.js,*.ts,*.vue' } }, []);
    const result = await analyzeProject(prepareInput(files as Record<string, File<void>[]>, true));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(path.join(fixtures, 'parsing-error.js'))]).toMatchObject({
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
    const result = await analyzeProject(prepareInput({} as Record<string, File<void>[]>));
    expect(result).toEqual(
      expect.objectContaining({
        files: {},
        meta: expect.objectContaining({}),
      }),
    );
  });
});
