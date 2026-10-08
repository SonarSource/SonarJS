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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import stylelint from 'stylelint';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { createStylelintConfig } from '../../linter/config.js';
import { cssRulesMeta } from '../metadata.js';
import { messages } from './rule.js';

const RULE = 'sonar/declaration-no-important';
const KEYFRAMES_RULE = 'keyframe-declaration-no-important';
const ANNOTATION_RULE = 'sonar/annotation-no-unknown';
const text = `${messages.important} (${RULE})`;

const ruleTester = new StylelintRuleTester(RULE);

type ReportedIssue = {
  rule: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
};

async function lint(
  code: string,
  rules: string[],
  codeFilename = 'test.css',
): Promise<ReportedIssue[]> {
  const config = createStylelintConfig(
    rules.map((key: string): { key: string; configurations: [] } => ({ key, configurations: [] })),
  );
  const {
    results: [{ warnings }],
  } = await stylelint.lint({ code, codeFilename, config });
  return warnings
    .map(({ rule, line, column, endLine, endColumn }: stylelint.Warning): ReportedIssue => ({
      rule,
      line,
      column,
      endLine,
      endColumn,
    }))
    .sort((a: ReportedIssue, b: ReportedIssue): number => a.line - b.line || a.column - b.column);
}

function byAnnotationOrImportant(issue: ReportedIssue): boolean {
  return issue.rule === RULE || issue.rule === ANNOTATION_RULE;
}

function pick(issue: ReportedIssue): [string, number] {
  return [issue.rule, issue.line];
}

describe('S9423 (sonar/declaration-no-important)', (): void => {
  it('accepts declarations without !important', (): Promise<void> =>
    ruleTester.valid({ code: 'a { color: pink; }' }));

  it('accepts !important inside comments and strings', (): Promise<void> =>
    ruleTester.valid({ code: '/* color: pink !important; */ a { content: "!important"; }' }));

  it('reports !important on the annotation', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { color: pink !important; }',
      errors: [{ text, line: 1, column: 17 }],
    }));

  it('highlights the whole annotation', async (): Promise<void> => {
    expect(await lint('a { color: pink ! important; }', [RULE])).toEqual([
      { rule: RULE, line: 1, column: 17, endLine: 1, endColumn: 28 },
    ]);
  });

  it('reports !important with spaces and different casing', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { color: pink ! important; }\nb { color: red !IMPORTANT; }',
      errors: [
        { text, line: 1, column: 17 },
        { text, line: 2, column: 16 },
      ],
    }));

  it('reports every declaration using !important', (): Promise<void> =>
    ruleTester.invalid({
      code: `.button {
  color: red !important;
  margin: 0;
  padding: 0 !important;
}`,
      errors: [
        { text, line: 2 },
        { text, line: 4 },
      ],
    }));

  it('reports !important inside nested at-rules', (): Promise<void> =>
    ruleTester.invalid({
      code: '@media (min-width: 600px) { a { color: pink !important; } }',
      errors: [{ text, line: 1, column: 45 }],
    }));

  it('reports !important on custom properties', (): Promise<void> =>
    ruleTester.invalid({
      code: ':root { --main-color: pink !important; }',
      errors: [{ text, line: 1 }],
    }));

  it('reports !important in SCSS', (): Promise<void> =>
    ruleTester.invalid({
      code: '.a { .b { color: pink !important; } }',
      codeFilename: 'styles.scss',
      errors: [{ text, line: 1 }],
    }));

  it('reports !important in LESS', (): Promise<void> =>
    ruleTester.invalid({
      code: '@color: pink;\n.a { color: @color !important; }',
      codeFilename: 'styles.less',
      errors: [{ text, line: 2 }],
    }));

  it('reports !important in a Vue style block', (): Promise<void> =>
    ruleTester.invalid({
      codeFilename: 'component.vue',
      code: `<template><div /></template>
<style>
a { color: pink !important; }
</style>`,
      errors: [{ text, line: 3 }],
    }));

  it('reports !important in HTML style blocks and attributes', (): Promise<void> =>
    ruleTester.invalid({
      codeFilename: 'page.html',
      code: `<style>
a { color: pink !important; }
</style>
<p style="color: red !important">text</p>`,
      errors: [
        { text, line: 2 },
        { text, line: 4 },
      ],
    }));

  it('ignores !important in keyframes even when S4655 is not enabled', (): Promise<void> =>
    ruleTester.valid({
      code:
        '@keyframes fade { from { opacity: 0 !important; } to { opacity: 1; } }\n' +
        '@-webkit-keyframes fade { from { opacity: 0 !important; } }',
    }));

  it('leaves !important in keyframes to S4655 when it is enabled', async (): Promise<void> => {
    expect(
      await lint(
        '@keyframes fade { from { opacity: 0 !important; } }\n' +
          '@-webkit-keyframes fade { from { opacity: 0 !important; } }',
        [RULE, KEYFRAMES_RULE],
      ),
    ).toEqual([
      { rule: KEYFRAMES_RULE, line: 1, column: 37, endLine: 1, endColumn: 47 },
      { rule: KEYFRAMES_RULE, line: 2, column: 45, endLine: 2, endColumn: 55 },
    ]);
  });

  it('still reports !important outside keyframes when S4655 is enabled', async (): Promise<void> => {
    expect(
      (
        await lint(
          'a { color: pink !important; }\n@keyframes fade { from { opacity: 0 !important; } }',
          [RULE, KEYFRAMES_RULE],
        )
      ).map(({ rule, line }: ReportedIssue): [string, number] => [rule, line]),
    ).toEqual([
      [RULE, 1],
      [KEYFRAMES_RULE, 2],
    ]);
  });

  it('leaves !important in keyframes to S4655 in SCSS and Vue files', async (): Promise<void> => {
    const scss =
      '.a { color: red !important; }\n@keyframes fade { from { opacity: 0 !important; } }';
    expect(
      (await lint(scss, [RULE, KEYFRAMES_RULE], 'styles.scss')).map(
        ({ rule, line }: ReportedIssue): [string, number] => [rule, line],
      ),
    ).toEqual([
      [RULE, 1],
      [KEYFRAMES_RULE, 2],
    ]);
    expect(
      (
        await lint(
          `<template><div /></template>\n<style>\n${scss}\n</style>`,
          [RULE, KEYFRAMES_RULE],
          'c.vue',
        )
      ).map(({ rule, line }: ReportedIssue): [string, number] => [rule, line]),
    ).toEqual([
      [RULE, 3],
      [KEYFRAMES_RULE, 4],
    ]);
  });

  it('does not relabel warnings of rules running concurrently', async (): Promise<void> => {
    const allRules = cssRulesMeta
      .map(({ stylelintKey }: { stylelintKey: string }): string => stylelintKey)
      .filter((key: string): boolean => key !== 'no-empty-source');

    expect(
      (await lint('.a\n  margin: 0 !important\n', allRules, 'styles.sass'))
        .filter(byAnnotationOrImportant)
        .map(pick),
    ).toEqual([[ANNOTATION_RULE, 2]]);
    expect(
      (await lint('a { color: pink !important; }\nb { color: red !imprtant; }', allRules))
        .filter(byAnnotationOrImportant)
        .map(pick),
    ).toEqual([
      [RULE, 1],
      [ANNOTATION_RULE, 2],
    ]);
  });

  it('honors stylelint disable comments for the rule', (): Promise<void> =>
    ruleTester.valid({
      code: `/* stylelint-disable-next-line ${RULE} */
a { color: pink !important; }
/* stylelint-disable */
b { color: pink !important; }`,
    }));

  it('ignores disable comments for other rules', (): Promise<void> =>
    ruleTester.invalid({
      code: `/* stylelint-disable-next-line ${KEYFRAMES_RULE} */
a { color: pink !important; }`,
      errors: [{ text, line: 2 }],
    }));

  it('reports !important in prefers-reduced-motion resets', (): Promise<void> =>
    ruleTester.invalid({
      // known limitation: motion-disabling resets need !important, but telling them
      // apart from motion-forcing values would require parsing durations
      code: `@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; }
}`,
      errors: [{ text, line: 2 }],
    }));
});
