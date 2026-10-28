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
import { meta } from './meta.js';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { createStylelintConfig } from '../../linter/config.js';

const RULE = meta.bindings[0].stylelintKey;
const UPSTREAM_RULE = meta.bindings[0].upstreamRule;
const ruleTester = new StylelintRuleTester(RULE);
const ruleTesterWithIgnore = new StylelintRuleTester(RULE, [
  true,
  { ignoreAnnotations: ['custom'] },
]);

describe('S8757 (sonar/annotation-no-unknown)', () => {
  it('accepts !important in CSS', () => ruleTester.valid({ code: 'a { color: red !important; }' }));

  it('reports unknown annotation in CSS', () =>
    ruleTester.invalid({
      code: 'a { color: red !imprtant; }',
      errors: [{ text: 'Unknown annotation "!imprtant" (sonar/annotation-no-unknown)', line: 1 }],
    }));

  it('does not report !default in SCSS', () =>
    ruleTester.valid({ code: '$color: red !default;', codeFilename: 'styles.scss' }));

  it('does not report !global in SCSS', () =>
    ruleTester.valid({ code: '$color: red !global;', codeFilename: 'styles.scss' }));

  it('still reports actual typos in SCSS', () =>
    ruleTester.invalid({
      code: 'a { color: red !imprtant; }',
      codeFilename: 'styles.scss',
      errors: [{ text: 'Unknown annotation "!imprtant" (sonar/annotation-no-unknown)', line: 1 }],
    }));

  it('does not report !default in Sass', () =>
    ruleTester.valid({ code: '$color: red !default', codeFilename: 'styles.sass' }));

  it('does not report !global in Sass', () =>
    ruleTester.valid({ code: '$color: red !global', codeFilename: 'styles.sass' }));

  it('respects user-configured ignoreAnnotations in CSS', () =>
    ruleTesterWithIgnore.valid({ code: 'a { color: red !custom; }' }));

  it('merges user ignoreAnnotations with Sass defaults in SCSS', () =>
    ruleTesterWithIgnore.valid({ code: '$x: 1 !default !custom;', codeFilename: 'styles.scss' }));

  it('does not report !default or !global in a Vue file with a SCSS style block', () =>
    ruleTester.valid({
      codeFilename: 'component.vue',
      code: `<template><div /></template>
<style lang="scss">
$color: red !default;
$size: 10px !global;
</style>`,
    }));

  it('does not report !default in a SCSS style block preceded by an inline style', () =>
    ruleTester.valid({
      codeFilename: 'component.vue',
      code: `<template><div style="color: red"></div></template>
<style lang="scss">
$color: red !default;
</style>`,
    }));

  it('still reports typos in a Vue file with a plain CSS style block', () =>
    ruleTester.invalid({
      codeFilename: 'component.vue',
      code: `<template><div /></template>
<style>
a { color: red !imprtant; }
</style>`,
      errors: [{ text: 'Unknown annotation "!imprtant" (sonar/annotation-no-unknown)', line: 3 }],
    }));

  for (const extension of ['html', 'vue']) {
    for (const lang of ['scss', 'sass']) {
      for (const sassFirst of [true, false]) {
        it(`isolates ${lang} and CSS warnings in ${extension} with Sass ${sassFirst ? 'first' : 'last'}`, async () => {
          const end = lang === 'scss' ? ';' : '';
          const sass = `<style lang="${lang}">
$color: red !default${end}
</style>`;
          const css = `<style>
a { color: red !default; margin: 0 !global; padding: 0 !imprtant; }
</style>`;
          const code = (sassFirst ? [sass, css] : [css, sass]).join('\n');
          const config = createStylelintConfig([{ key: RULE, configurations: [] }]);
          const result = await stylelint.lint({
            code,
            codeFilename: `component.${extension}`,
            config,
          });
          expect(result.results[0].parseErrors).toHaveLength(0);
          expect(result.results[0].warnings).toHaveLength(3);
          expect(result.results[0].warnings.map(({ rule, text }) => [rule, text])).toEqual(
            expect.arrayContaining(
              ['!default', '!global', '!imprtant'].map(annotation => [
                RULE,
                `Unknown annotation "${annotation}" (${RULE})`,
              ]),
            ),
          );
        });
      }
    }
  }

  it('honors Sonar disable comments and re-enables reporting', () =>
    ruleTester.invalid({
      code: `/* stylelint-disable-next-line ${RULE} */
a { color: red !typo; }
b { color: red !typo; } /* stylelint-disable-line ${RULE} */
/* stylelint-disable ${RULE} */
c { color: red !typo; }
/* stylelint-enable ${RULE} */
d { color: red !typo; }`,
      errors: [{ text: `Unknown annotation "!typo" (${RULE})`, line: 7 }],
    }));

  it('honors Sonar disable comments in embedded Sass', () =>
    ruleTester.valid({
      codeFilename: 'component.vue',
      code: `<style lang="scss">
/* stylelint-disable-next-line ${RULE} */
$color: red !typo;
</style>`,
    }));

  it('preserves the existing exemption on Sass declarations', () =>
    ruleTester.valid({
      codeFilename: 'styles.scss',
      code: 'a { color: red !default; margin: 0 !global; }',
    }));

  for (const disabled of [RULE, UPSTREAM_RULE]) {
    it(`isolates disable comments for ${disabled} from the other rule`, async () => {
      const config = createStylelintConfig(
        [RULE, UPSTREAM_RULE].map(key => ({ key, configurations: [] })),
      );
      const result = await stylelint.lint({
        code: `/* stylelint-disable-next-line ${disabled} */\na { color: red !typo; }`,
        codeFilename: 'test.css',
        config,
      });
      const expectedRule = disabled === RULE ? UPSTREAM_RULE : RULE;
      expect(result.results[0].warnings.map(({ rule, text }) => [rule, text])).toEqual([
        [expectedRule, `Unknown annotation "!typo" (${expectedRule})`],
      ]);
    });
  }

  it('preserves warnings from concurrent upstream and decorated rules', async () => {
    const importantRule = 'sonar/declaration-no-important';
    const config = createStylelintConfig(
      [RULE, UPSTREAM_RULE, importantRule].map(key => ({ key, configurations: [] })),
    );
    const result = await stylelint.lint({
      code: '$color: red !default;\na { color: red !typo; padding: 0 !important; }',
      codeFilename: 'styles.scss',
      config,
    });
    expect(result.results[0].warnings).toHaveLength(4);
    expect(result.results[0].warnings.map(({ rule, line }) => [rule, line])).toEqual(
      expect.arrayContaining([
        [UPSTREAM_RULE, 1],
        [UPSTREAM_RULE, 2],
        [RULE, 2],
        [importantRule, 2],
      ]),
    );
  });

  it('preserves upstream option diagnostics', async () => {
    const config = createStylelintConfig([{ key: RULE, configurations: [42] }]);
    const result = await stylelint.lint({ code: 'a { color: red !typo; }', config });
    expect(result.results[0].invalidOptionWarnings).toHaveLength(1);
    expect(result.results[0].warnings).toHaveLength(0);
  });
});
