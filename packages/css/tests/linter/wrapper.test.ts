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
import path from 'node:path';
import stylelint from 'stylelint';
import { describe, it } from 'node:test';
import { expect } from 'expect';

import { rule as S5362 } from '../../src/rules/S5362/index.js';
import { LinterWrapper } from '../../src/linter/wrapper.js';
import { readFile } from '../../../shared/src/helpers/files.js';
import { createStylelintConfig, RuleConfig } from '../../src/linter/config.js';

describe('LinterWrapper', () => {
  it('should lint with a stylelint rule', async () => {
    const filePath = path.join(import.meta.dirname, './fixtures/block.css');
    const rules = [{ key: 'block-no-empty', configurations: [] }];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toEqual([
      {
        ruleId: 'block-no-empty',
        line: 1,
        column: 3,
        message: 'Unexpected empty block (block-no-empty)',
      },
    ]);
  });

  it('should lint with an internal rule', async () => {
    const filePath = path.join(import.meta.dirname, './fixtures/calc.css');
    const rules = [{ key: S5362.ruleName, configurations: [] }];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toEqual([
      {
        ruleId: S5362.ruleName,
        line: 1,
        column: 6,
        message: `Fix this malformed 'calc' expression. (sonar/function-calc-no-invalid)`,
      },
    ]);
  });

  it('should lint with a configured rule', async () => {
    const filePath = path.join(import.meta.dirname, './fixtures/font-family.css');
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
        line: 2,
        column: 18,
        message:
          'Unexpected missing generic font family (font-family-no-missing-generic-family-keyword)',
      },
    ]);
  });

  it('should not lint with a disabled rule', async () => {
    const filePath = path.join(import.meta.dirname, './fixtures/block.css');
    const rules = [];
    const options = await createStylelintOptions(filePath, rules);

    const linter = new LinterWrapper();
    const { issues } = await linter.lint(filePath, options);

    expect(issues).toHaveLength(0);
  });
});

async function createStylelintOptions(
  filePath: string,
  rules: RuleConfig[],
): Promise<stylelint.LinterOptions> {
  const code = await readFile(filePath);
  const config = createStylelintConfig(rules);
  return { code, codeFilename: filePath, config };
}
