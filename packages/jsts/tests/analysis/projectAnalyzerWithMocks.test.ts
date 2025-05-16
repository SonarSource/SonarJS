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
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';
import { join } from 'node:path/posix';
import { clearTsConfigCache } from '../../src/analysis/projectAnalysis/tsconfigs.js';
import { clearFilesCache } from '../../src/analysis/projectAnalysis/files.js';
import ts from 'typescript';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('analyzeProjectWithMocks', () => {
  beforeEach(() => {
    clearTsConfigCache();
    clearFilesCache();
  });

  it('should handle handle program creation with grace', async t => {
    const baseDir = join(fixtures, 'simple-tsconfig');
    const namedImports = await import('../../src/program/program.js');
    t.mock.module('file:' + join(import.meta.dirname, '..', '..', 'src', 'program', 'program.js'), {
      namedExports: {
        ...namedImports,
        createAndSaveProgram: () => {
          throw new Error('Mock error');
        },
      },
    });

    let dynamicAnalyzeProject;
    ({ analyzeProject: dynamicAnalyzeProject } = await import(
      '../../src/analysis/projectAnalysis/projectAnalyzer.js'
    ));
    const result = await dynamicAnalyzeProject({
      baseDir,
    });
    expect(result.meta.warnings.length).toEqual(1);
    const resultWarning = result.meta.warnings.at(0);
    expect(resultWarning).toEqual(
      `Failed to create TypeScript program with TSConfig file ${join(baseDir, 'tsconfig.json')}. Highest TypeScript supported version is ${ts.version}`,
    );
  });
});
