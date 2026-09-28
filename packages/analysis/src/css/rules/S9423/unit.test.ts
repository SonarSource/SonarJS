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
import { messages } from './rule.js';

const RULE = 'sonar/declaration-no-important';
const KEYFRAMES_RULE = 'keyframe-declaration-no-important';
const text = `${messages.important} (${RULE})`;

const ruleTester = new StylelintRuleTester(RULE);

async function lintWithKeyframesRule(
  code: string,
): Promise<{ rule: string; line: number; column: number }[]> {
  const config = createStylelintConfig([
    { key: RULE, configurations: [] },
    { key: KEYFRAMES_RULE, configurations: [] },
  ]);
  const {
    results: [{ warnings }],
  } = await stylelint.lint({ code, codeFilename: 'test.css', config });
  return warnings
    .map(({ rule, line, column }: stylelint.Warning) => ({ rule, line, column }))
    .sort(
      (a: { line: number; column: number }, b: { line: number; column: number }): number =>
        a.line - b.line || a.column - b.column,
    );
}

describe('S9423 (sonar/declaration-no-important)', () => {
  it('accepts declarations without !important', () =>
    ruleTester.valid({ code: 'a { color: pink; }' }));

  it('accepts !important inside comments and strings', () =>
    ruleTester.valid({ code: '/* color: pink !important; */ a { content: "!important"; }' }));

  it('reports !important on the annotation', () =>
    ruleTester.invalid({
      code: 'a { color: pink !important; }',
      errors: [{ text, line: 1, column: 17 }],
    }));

  it('reports !important with spaces and different casing', () =>
    ruleTester.invalid({
      code: 'a { color: pink ! important; }\nb { color: red !IMPORTANT; }',
      errors: [
        { text, line: 1, column: 17 },
        { text, line: 2, column: 16 },
      ],
    }));

  it('reports every declaration using !important', () =>
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

  it('reports !important inside nested at-rules', () =>
    ruleTester.invalid({
      code: '@media (min-width: 600px) { a { color: pink !important; } }',
      errors: [{ text, line: 1, column: 45 }],
    }));

  it('reports !important on custom properties', () =>
    ruleTester.invalid({
      code: ':root { --main-color: pink !important; }',
      errors: [{ text, line: 1 }],
    }));

  it('reports !important in SCSS', () =>
    ruleTester.invalid({
      code: '.a { .b { color: pink !important; } }',
      codeFilename: 'styles.scss',
      errors: [{ text, line: 1 }],
    }));

  it('reports !important in LESS', () =>
    ruleTester.invalid({
      code: '@color: pink;\n.a { color: @color !important; }',
      codeFilename: 'styles.less',
      errors: [{ text, line: 2 }],
    }));

  it('reports !important in a Vue style block', () =>
    ruleTester.invalid({
      codeFilename: 'component.vue',
      code: `<template><div /></template>
<style>
a { color: pink !important; }
</style>`,
      errors: [{ text, line: 3 }],
    }));

  it('reports !important in keyframes when S4655 is not enabled', () =>
    ruleTester.invalid({
      code: '@keyframes fade { from { opacity: 0 !important; } to { opacity: 1; } }',
      errors: [{ text, line: 1 }],
    }));

  it('leaves !important in keyframes to S4655 when it is enabled', async () => {
    expect(
      await lintWithKeyframesRule(
        '@keyframes fade { from { opacity: 0 !important; } }\n' +
          '@-webkit-keyframes fade { from { opacity: 0 !important; } }',
      ),
    ).toEqual([
      { rule: KEYFRAMES_RULE, line: 1, column: 37 },
      { rule: KEYFRAMES_RULE, line: 2, column: 45 },
    ]);
  });

  it('still reports !important outside keyframes when S4655 is enabled', async () => {
    expect(
      await lintWithKeyframesRule(
        'a { color: pink !important; }\n@keyframes fade { from { opacity: 0 !important; } }',
      ),
    ).toEqual([
      { rule: RULE, line: 1, column: 17 },
      { rule: KEYFRAMES_RULE, line: 2, column: 37 },
    ]);
  });
});
