/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import stylelint from 'stylelint';
import { transform } from '../../../src/linter/issues/index.js';
import { describe, it, mock, Mock } from 'node:test';
import { expect } from 'expect';

describe('transform', () => {
  it('should transform Stylelint results into issues', () => {
    const filePath = '/tmp/path';
    const results = [
      {
        source: filePath,
        warnings: [
          {
            rule: 'some-rule',
            text: 'some-text',
            line: 42,
            column: 4242,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toEqual([
      {
        ruleId: 'some-rule',
        message: 'some-text',
        line: 42,
        column: 4242,
      },
    ]);
  });

  it('should not transform Stylelint results from a different file', () => {
    console.log = mock.fn();

    const filePath = '/tmp/path';
    const source = '/some/fake/source';
    const results = [
      {
        source,
        warnings: [
          {
            rule: 'some-rule',
            text: 'some-text',
            line: 42,
            column: 4242,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toHaveLength(0);
    expect((console.log as Mock<typeof console.log>).mock.calls[0].arguments[0]).toEqual(
      `DEBUG For file [${filePath}] received issues with [${source}] as a source. They will not be reported.`,
    );
  });
});
