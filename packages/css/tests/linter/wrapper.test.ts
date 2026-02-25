/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import path from 'node:path';
import stylelint from 'stylelint';
import { describe, it } from 'node:test';
import { expect } from 'expect';

import { rule as S5362 } from '../../src/rules/S5362/index.js';
import { LinterWrapper } from '../../src/linter/wrapper.js';
import {
  readFile,
  normalizeToAbsolutePath,
  type NormalizedAbsolutePath,
} from '../../../shared/src/helpers/files.js';
import { createStylelintConfig, RuleConfig } from '../../src/linter/config.js';

describe('LinterWrapper', () => {
  it('should lint with a stylelint rule', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, './fixtures/block.css'),
    );
    const rules = [{ key: 'block-no-empty', configurations: [] }];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toEqual([
      {
        ruleId: 'block-no-empty',
        language: 'css',
        line: 1,
        column: 2,
        endLine: 1,
        endColumn: 5,
        message: 'Unexpected empty block',
      },
    ]);
  });

  it('should lint with an internal rule', async () => {
    const filePath = normalizeToAbsolutePath(path.join(import.meta.dirname, './fixtures/calc.css'));
    const rules = [{ key: S5362.ruleName, configurations: [] }];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toEqual([
      {
        ruleId: S5362.ruleName,
        language: 'css',
        line: 1,
        column: 5,
        endLine: 1,
        endColumn: 28,
        message: `Fix this malformed 'calc' expression.`,
      },
    ]);
  });

  it('should lint with a configured rule', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, './fixtures/font-family.css'),
    );
    const rules = [
      {
        key: 'font-family-no-missing-generic-family-keyword',
        configurations: [true, { ignoreFontFamilies: ['foo'] }],
      },
    ];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toEqual([
      {
        ruleId: 'font-family-no-missing-generic-family-keyword',
        language: 'css',
        line: 2,
        column: 17,
        endLine: 2,
        endColumn: 20,
        message: 'Unexpected missing generic font family',
      },
    ]);
  });

  it('should omit end positions for no-empty-source on an empty file', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, './fixtures/empty.css'),
    );
    const rules = [{ key: 'no-empty-source', configurations: [] }];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    // Stylelint reports line:1, column:1, endLine:1, endColumn:2 for empty files.
    // End positions are omitted because endColumn would exceed the line length (0 chars).
    expect(issues).toEqual([
      {
        ruleId: 'no-empty-source',
        language: 'css',
        line: 1,
        column: 0,
        message: 'Unexpected empty source',
      },
    ]);
  });

  it('should not lint with a disabled rule', async () => {
    const filePath = normalizeToAbsolutePath(
      path.join(import.meta.dirname, './fixtures/block.css'),
    );
    const rules = [];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toHaveLength(0);
  });
});

async function createStylelintOptions(
  filePath: NormalizedAbsolutePath,
  rules: RuleConfig[],
): Promise<stylelint.LinterOptions> {
  const code = await readFile(filePath);
  const config = createStylelintConfig(rules);
  return { code, codeFilename: filePath, config };
}
