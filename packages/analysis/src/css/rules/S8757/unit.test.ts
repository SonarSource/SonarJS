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
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';

const ruleTester = new StylelintRuleTester('sonar/annotation-no-unknown');
const ruleTesterWithIgnore = new StylelintRuleTester('sonar/annotation-no-unknown', [
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

  it('still reports typos in a Vue file with a plain CSS style block', () =>
    ruleTester.invalid({
      codeFilename: 'component.vue',
      code: `<template><div /></template>
<style>
a { color: red !imprtant; }
</style>`,
      errors: [{ text: 'Unknown annotation "!imprtant" (sonar/annotation-no-unknown)', line: 3 }],
    }));
});
