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
import { setImmediate as nextTurn } from 'node:timers/promises';
import { DEFAULT_IO_CONCURRENCY } from '../shared/src/helpers/concurrency.js';
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
      issues: [createCssIssue(6), createCssIssue(4), createCssIssue(328)],
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

  it('should create actual directory even with zero issues', async () => {
    const files = createFileResults();
    const results: ProjectAnalysisOutput = {
      files,
      meta: { warnings: [] },
    };

    await writeResults('/project', 'ace', results, actualPath);

    const stat = await fs.stat(actualPath);
    expect(stat.isDirectory()).toBe(true);
    const entries = await fs.readdir(actualPath);
    // Only S2260 (parsing errors) file should be absent — directory should be empty
    expect(entries).toEqual([]);
  });

  it('limits concurrent writes and produces every independent rule result', async ({ mock }) => {
    const files = createFileResults();
    files['/project/styles.css' as NormalizedAbsolutePath] = {
      issues: Array.from({ length: 64 }, (_, i) => ({
        ...createCssIssue(i + 1),
        ruleId: `rule-${i}`,
      })),
    };
    const originalWrite = fs.writeFile;
    let active = 0;
    let peak = 0;
    mock.method(fs, 'writeFile', async (...args) => {
      active++;
      peak = Math.max(peak, active);
      try {
        await nextTurn();
        return await Reflect.apply(originalWrite, fs, args);
      } finally {
        active--;
      }
    });
    await writeResults('/project', 'ace', { files, meta: { warnings: [] } }, actualPath);
    expect(peak).toBe(DEFAULT_IO_CONCURRENCY);
    expect(active).toBe(0);
    expect(await fs.readdir(actualPath)).toHaveLength(64);
    for (let i = 0; i < 64; i++) {
      expect(
        JSON.parse(await fs.readFile(path.join(actualPath, `css-rule-${i}.json`), 'utf8')),
      ).toEqual({
        'ace:styles.css': [i + 1],
      });
    }
  });

  it('preserves last-write precedence when template aliases target the same output', async () => {
    for (const ruleIds of [
      ['S124', 'CommentRegexTest'],
      ['CommentRegexTest', 'S124'],
    ]) {
      const files = createFileResults();
      const filePath = '/project/app.js' as NormalizedAbsolutePath;
      files[filePath] = {
        issues: ruleIds.map((ruleId, i) => ({
          ruleId,
          language: 'js',
          filePath,
          line: i + 1,
          column: 0,
          message: 'comment',
          secondaryLocations: [],
          ruleESLintKeys: [],
        })),
      };
      await writeResults('/project', 'ace', { files, meta: { warnings: [] } }, actualPath);
      expect(
        JSON.parse(
          await fs.readFile(path.join(actualPath, 'javascript-CommentRegexTest.json'), 'utf8'),
        ),
      ).toEqual({ 'ace:app.js': [2] });
    }
  });

  it('should preserve stable issue filename ordering', async () => {
    const files = createFileResults();
    files['/project/src/z.css' as NormalizedAbsolutePath] = {
      issues: [createCssIssue(4)],
    };
    files['/project/src/Z.css' as NormalizedAbsolutePath] = {
      issues: [createCssIssue(5)],
    };
    files['/project/src/a.css' as NormalizedAbsolutePath] = {
      issues: [createCssIssue(6)],
    };
    files['/project/src/aa.css' as NormalizedAbsolutePath] = {
      issues: [createCssIssue(7)],
    };
    const results: ProjectAnalysisOutput = {
      files,
      meta: { warnings: [] },
    };

    await writeResults('/project', 'ace', results, actualPath);

    const output = JSON.parse(
      await fs.readFile(path.join(actualPath, 'css-S4656.json'), 'utf8'),
    ) as Record<string, number[]>;

    expect(Object.keys(output)).toEqual([
      'ace:src/Z.css',
      'ace:src/a.css',
      'ace:src/aa.css',
      'ace:src/z.css',
    ]);
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
