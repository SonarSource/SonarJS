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
import { analyzeProject } from '../../src/analysis/projectAnalysis/projectAnalyzer.js';
import { findFiles } from '../../../shared/src/helpers/find-files.js';
import { join, extname } from 'node:path/posix';
import { clearTsConfigCache } from '../../src/analysis/projectAnalysis/tsconfigs.js';
import { ErrorCode } from '../../../shared/src/errors/error.js';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('analyzeProject', () => {
  beforeEach(() => {
    clearTsConfigCache();
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
      parsingError: {
        code: ErrorCode.Parsing,
        message: 'Unexpected token (3:0)',
        line: 3,
      },
    });
    expect(result.meta.withWatchProgram).toBeFalsy();
    expect(result.meta.withProgram).toBeTruthy();
    expect(result.meta.programsCreated.length).toEqual(3);
  });

  it('should analyze the whole project with watch program', async () => {
    const result = await analyzeProject(prepareInput(undefined, true));
    expect(result).toBeDefined();

    expect(result.files[toUnixPath(join(fixtures, 'parsing-error.js'))]).toMatchObject({
      parsingError: {
        code: ErrorCode.Parsing,
        message: 'Unexpected token (3:0)',
        line: 3,
      },
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
    configuration: {
      sonarlint,
    },
  };
}
