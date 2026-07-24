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
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { expect } from 'expect';

import { writeResults } from './lits.js';
import { createFileResults, type ProjectAnalysisOutput } from '../analysis/src/projectAnalysis.js';
import type { CssIssue } from '../analysis/src/css/linter/issues/issue.js';
import type { NormalizedAbsolutePath } from '../shared/src/helpers/files.js';

const actualPath = path.join(import.meta.dirname, 'actual', 'lits-test');

describe('writeResults', () => {
  afterEach(async () => {
    await fs.rm(actualPath, { recursive: true, force: true });
  });

  it('should write issue lines in ascending order', async () => {
    const filePath = '/project/src/styles.css' as NormalizedAbsolutePath;
    const files = createFileResults();
    files[filePath] = {
      issues: [
        createCssIssue(6),
        createCssIssue(4),
        createCssIssue(328),
      ],
    };
    const results: ProjectAnalysisOutput = {
      files,
      meta: { warnings: [] },
    };

    await writeResults('/project', 'ace', results, actualPath);

    const output = JSON.parse(
      await fs.readFile(path.join(actualPath, 'css-S4656.json'), 'utf8'),
    ) as Record<string, number[]>;

    expect(output).toEqual({
      'ace:src/styles.css': [4, 6, 328],
    });
  });
});

function createCssIssue(line: number): CssIssue {
  return {
    ruleId: 'declaration-block-no-duplicate-properties',
    language: 'css',
    line,
    column: 0,
    message: 'Duplicate property',
  };
}
