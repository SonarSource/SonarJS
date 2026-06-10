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
import stylelint from 'stylelint';
import { transform } from '../../../../src/css/linter/issues/transform.js';
import { describe, it, beforeEach, afterEach, type Mock } from 'node:test';
import { expect } from 'expect';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';
import { cssOnlyRuleKeys } from '../../../../src/css/linter/css-only-rules.js';

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

  it('should not emit endLine/endColumn for no-empty-source rule', () => {
    const filePath = normalizeToAbsolutePath('/tmp/path');
    // Stylelint reports endColumn: 2 on empty files, which after 1→0 conversion
    // becomes offset 1 on a line with 0 characters — invalid for SonarQube.
    const results = [
      {
        source: filePath as string,
        warnings: [
          {
            rule: 'no-empty-source',
            text: 'Empty source',
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 2,
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
            text: 'Empty block (block-no-empty)',
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
        message: 'Empty block',
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

  it('should default to line 1 and column 0 for invalid positions', ({ mock }) => {
    console.log = mock.fn(console.log);

    const filePath = normalizeToAbsolutePath('/tmp/path');
    const results = [
      {
        source: filePath as string,
        warnings: [
          {
            rule: 'no-empty-source',
            text: 'Empty source',
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
        message: 'Empty source',
        language: 'css',
        line: 1,
        column: 0,
      },
    ]);
    expect((console.log as Mock<typeof console.log>).mock.calls[0].arguments[0]).toMatch(
      /^WARN Invalid position for rule no-empty-source/,
    );
  });

  describe('CSS-only rule filtering in HTML/Vue files', () => {
    const filePath = normalizeToAbsolutePath('/tmp/page.html');

    beforeEach(() => cssOnlyRuleKeys.add('css-only-rule'));
    afterEach(() => cssOnlyRuleKeys.delete('css-only-rule'));

    function makeDocumentResult(
      blocks: Array<{ lang?: string; startLine: number; endLine: number }>,
      warnings: Array<{ rule: string; line: number }>,
    ): stylelint.LintResult {
      const nodes = blocks.map(b => ({
        type: 'root' as const,
        source: {
          lang: b.lang,
          start: { line: b.startLine, column: 1, offset: 0 },
          end: { line: b.endLine, column: 1, offset: 0 },
        },
      }));
      return {
        source: filePath as string,
        warnings: warnings.map(w => ({
          rule: w.rule,
          text: `${w.rule} message (${w.rule})`,
          line: w.line,
          column: 1,
        })),
        _postcssResult: { root: { type: 'document', nodes } },
      } as unknown as stylelint.LintResult;
    }

    it('reports CSS-only rule warnings from plain CSS blocks', () => {
      const result = makeDocumentResult(
        [{ startLine: 1, endLine: 5 }], // no lang → CSS
        [{ rule: 'css-only-rule', line: 3 }],
      );
      const issues = transform([result], filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('css-only-rule');
    });

    it('suppresses CSS-only rule warnings from non-CSS embedded blocks', () => {
      const result = makeDocumentResult(
        [{ lang: 'scss', startLine: 1, endLine: 10 }],
        [{ rule: 'css-only-rule', line: 5 }],
      );
      const issues = transform([result], filePath);
      expect(issues).toHaveLength(0);
    });

    it('suppresses warnings from less, sass, stylus and styl blocks too', () => {
      const result = makeDocumentResult(
        [
          { lang: 'less', startLine: 1, endLine: 5 },
          { lang: 'sass', startLine: 7, endLine: 12 },
          { lang: 'stylus', startLine: 14, endLine: 18 },
          { lang: 'styl', startLine: 20, endLine: 24 },
        ],
        [
          { rule: 'css-only-rule', line: 3 },
          { rule: 'css-only-rule', line: 9 },
          { rule: 'css-only-rule', line: 16 },
          { rule: 'css-only-rule', line: 22 },
        ],
      );
      expect(transform([result], filePath)).toHaveLength(0);
    });

    it('does not suppress regular rule warnings from non-CSS blocks', () => {
      const result = makeDocumentResult(
        [{ lang: 'scss', startLine: 1, endLine: 10 }],
        [{ rule: 'regular-rule', line: 5 }],
      );
      const issues = transform([result], filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('regular-rule');
    });

    it('handles mixed CSS and non-CSS blocks correctly', () => {
      const result = makeDocumentResult(
        [
          { startLine: 1, endLine: 5 },       // CSS block
          { lang: 'scss', startLine: 7, endLine: 15 }, // SCSS block
        ],
        [
          { rule: 'css-only-rule', line: 3 },  // in CSS block → keep
          { rule: 'css-only-rule', line: 10 }, // in SCSS block → suppress
        ],
      );
      const issues = transform([result], filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0].line).toBe(3);
    });

    it('does not filter warnings from plain CSS files (no document root)', () => {
      const cssFilePath = normalizeToAbsolutePath('/tmp/styles.css');
      const result = {
        source: cssFilePath as string,
        warnings: [{ rule: 'css-only-rule', text: 'msg (css-only-rule)', line: 1, column: 1 }],
        _postcssResult: { root: { type: 'root' } }, // not a document
      } as unknown as stylelint.LintResult;
      const issues = transform([result], cssFilePath);
      expect(issues).toHaveLength(1);
    });
  });
});
