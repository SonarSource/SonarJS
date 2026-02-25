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
import stylelint from 'stylelint';
import { transform } from '../../../src/linter/issues/index.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

describe('transform', () => {
  it('should transform Stylelint results into issues', () => {
    const filePath = normalizeToAbsolutePath('/tmp/path');
    const results = [
      {
        // source must match the normalized filePath for issues to be reported
        source: filePath as string,
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
        language: 'css',
        line: 42,
        column: 4241,
      },
    ]);
  });

  it('should pass through endLine and endColumn when provided', () => {
    const filePath = normalizeToAbsolutePath('/tmp/path');
    const results = [
      {
        source: filePath as string,
        warnings: [
          {
            rule: 'some-rule',
            text: 'some-text',
            line: 1,
            column: 5,
            endLine: 1,
            endColumn: 10,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toEqual([
      {
        ruleId: 'some-rule',
        message: 'some-text',
        language: 'css',
        line: 1,
        column: 4,
        endLine: 1,
        endColumn: 9,
      },
    ]);
  });

  it('should omit endLine and endColumn when not provided', () => {
    const filePath = normalizeToAbsolutePath('/tmp/path');
    const results = [
      {
        source: filePath as string,
        warnings: [
          {
            rule: 'some-rule',
            text: 'some-text',
            line: 1,
            column: 5,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues[0]).not.toHaveProperty('endLine');
    expect(issues[0]).not.toHaveProperty('endColumn');
  });

  it('should strip the trailing (rulekey) suffix from messages', () => {
    const filePath = normalizeToAbsolutePath('/tmp/path');
    const results = [
      {
        source: filePath as string,
        warnings: [
          {
            rule: 'block-no-empty',
            text: 'Unexpected empty block (block-no-empty)',
            line: 1,
            column: 1,
          },
        ],
      },
    ] as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toEqual([
      {
        ruleId: 'block-no-empty',
        message: 'Unexpected empty block',
        language: 'css',
        line: 1,
        column: 0,
      },
    ]);
  });

  it('should not transform Stylelint results from a different file', ({ mock }) => {
    console.log = mock.fn(console.log);

    const filePath = normalizeToAbsolutePath('/tmp/path');
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

  it('should default to line 1 and column 1 for invalid positions', ({ mock }) => {
    console.log = mock.fn(console.log);

    const filePath = normalizeToAbsolutePath('/tmp/path');
    const results = [
      {
        source: filePath as string,
        warnings: [
          {
            rule: 'no-empty-source',
            text: 'Unexpected empty source',
            line: NaN,
            column: undefined,
          },
        ],
      },
    ] as unknown as stylelint.LintResult[];

    const issues = transform(results, filePath);

    expect(issues).toEqual([
      {
        ruleId: 'no-empty-source',
        message: 'Unexpected empty source',
        language: 'css',
        line: 1,
        column: 0,
      },
    ]);
    expect((console.log as Mock<typeof console.log>).mock.calls[0].arguments[0]).toMatch(
      /^WARN Invalid position for rule no-empty-source/,
    );
  });
});
