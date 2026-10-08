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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { LinterWrapper } from '../../linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';

const RULE = 'sonar/declaration-property-value-no-unknown';
const ruleTester = new StylelintRuleTester(RULE);
const vuePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'component.vue'));

const RELATED_RULES = [
  'color-no-invalid-hex',
  'function-linear-gradient-no-nonstandard-direction',
  'string-no-newline',
  'unit-no-unknown',
  'sonar/annotation-no-unknown',
];

/** Lints each code snippet as a separate file, with S9424 and the related rules covering the parts it does not check */
async function lintWithRelatedRules(...codes: string[]): Promise<string[][]> {
  const linter = new LinterWrapper();
  linter.initialize([RULE, ...RELATED_RULES].map((key: string) => ({ key, configurations: [] })));
  const reported: string[][] = [];
  for (const [index, code] of codes.entries()) {
    const filePath = normalizeToAbsolutePath(path.join(import.meta.dirname, `file${index}.css`));
    const { issues } = await linter.lint(filePath, code);
    reported.push(issues.map((issue: { ruleId: string }): string => issue.ruleId).sort());
  }
  return reported;
}

describe('S9424 (sonar/declaration-property-value-no-unknown)', () => {
  it('accepts valid property values', () =>
    ruleTester.valid({
      code: `a {
  top: 0;
  position: absolute;
  transition: opacity 0.1s;
  display: inline;
  width: calc(100% + 10px);
  color: rgb(1 2 3);
  text-decoration: underline overline double;
}`,
    }));

  it('reports a keyword that the property does not accept', () =>
    ruleTester.invalid({
      code: 'a { top: red; }',
      errors: [
        {
          text: `Unknown value "red" for property "top" (${RULE})`,
          line: 1,
          column: 10,
          endLine: 1,
          endColumn: 13,
        },
      ],
    }));

  it('reports a misspelled keyword', () =>
    ruleTester.invalid({
      code: 'a { position: absolut; }',
      errors: [
        {
          text: `Unknown value "absolut" for property "position" (${RULE})`,
          line: 1,
          column: 15,
          endColumn: 22,
        },
      ],
    }));

  it('reports a quoted keyword', () =>
    ruleTester.invalid({
      code: "a { display: 'inline'; }",
      errors: [
        {
          text: `Unknown value "'inline'" for property "display" (${RULE})`,
          line: 1,
          column: 14,
          endColumn: 22,
        },
      ],
    }));

  it('reports a space inside a dimension', () =>
    ruleTester.invalid({
      code: 'a { transition: opacity 0.1 s; }',
      errors: [
        {
          text: `Unknown value "0.1" for property "transition" (${RULE})`,
          line: 1,
          column: 25,
          endColumn: 28,
        },
      ],
    }));

  it('reports keywords split by another component', () =>
    ruleTester.invalid({
      code: 'a { text-decoration: overline double underline; }',
      errors: [{ text: `Unknown value "underline" for property "text-decoration" (${RULE})` }],
    }));

  it('reports an invalid math expression', () =>
    ruleTester.invalid({
      code: 'a { width: calc(100% + 10); }',
      errors: [
        {
          text: `Invalid math expression "100% + 10" for property "width" (${RULE})`,
          line: 1,
          column: 17,
          endColumn: 26,
        },
      ],
    }));

  it('reports a standard function called with invalid arguments', () =>
    ruleTester.invalid({
      code: 'a { color: rgb(1 2); }',
      errors: [
        {
          text: `Unknown value "rgb(1 2)" for property "color" (${RULE})`,
          line: 1,
          column: 12,
          endColumn: 20,
        },
      ],
    }));

  it('reports a quoted value even when the string looks like a function call', () =>
    ruleTester.invalid({
      code: "a { display: 'inline(x)'; }",
      errors: [{ text: `Unknown value "'inline(x)'" for property "display" (${RULE})` }],
    }));

  it('reports a missing value on the whole declaration', () =>
    ruleTester.invalid({
      code: 'a {\n  letter-spacing:\n}',
      errors: [
        {
          text: `Missing value for property "letter-spacing" (${RULE})`,
          line: 2,
          column: 3,
          endLine: 2,
          endColumn: 18,
        },
      ],
    }));

  it('reports a value that does not match a registered custom property syntax', () =>
    ruleTester.invalid({
      code: `@property --gap {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
a { --gap: red; }`,
      errors: [
        {
          text: `Unknown value "red" for property "--gap" (${RULE})`,
          line: 6,
          column: 12,
          endColumn: 15,
        },
      ],
    }));

  it('accepts a value that matches a registered custom property syntax', () =>
    ruleTester.valid({
      code: `@property --gap {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}
a { --gap: 1rem; }`,
    }));

  it('ignores unregistered custom properties and values using var()', () =>
    ruleTester.valid({ code: 'a { --anything: red; top: var(--anything); }' }));

  it('ignores vendor-prefixed values', () =>
    ruleTester.valid({
      code: `a {
  display: -ms-flexbox;
  display: -ms-flex;
  text-overflow: -o-ellipsis-lastline;
  background: -ms-linear-gradient(#fff, #d3d3d3);
  background-image: -khtml-gradient(linear, left top, left bottom, from(#292929), to(#191919));
}`,
    }));

  it('ignores legacy Internet Explorer filters', () =>
    ruleTester.valid({
      code: `a {
  filter: alpha(opacity=50);
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#80000000', endColorstr='#80000000');
  -ms-filter: none;
}`,
    }));

  it('ignores values calling unknown functions', () =>
    ruleTester.valid({
      code: `a {
  color: theme('colors.gray.400', #a1a1aa);
  border-color: theme('borderColor.DEFAULT', currentColor);
  color: foo(1);
  width: --double(1px);
}`,
    }));

  it('ignores values nesting unknown functions inside known ones', () =>
    ruleTester.valid({
      code: `a {
  box-shadow: 2px 2px 6px -2px darken(black, 10%);
  transform: scale((unit(1px) / unit(2px)));
  margin-top: calc(-(foo / 2) - 10px);
}`,
    }));

  it('ignores standard functions that the CSS grammar does not define yet', () =>
    ruleTester.valid({
      code: `a {
  order: sibling-count();
  color: color-contrast(white vs red, blue);
  background-image: image-rect(url(a.png), 0, 10, 10, 0);
}`,
    }));

  it('checks the calls of functions that the CSS grammar defines', () =>
    ruleTester.invalid({
      code: 'a { box-shadow: 2px 2px 6px -2px fade(black, 10%); }',
      errors: [{ text: `Unknown value "fade(black, 10%)" for property "box-shadow" (${RULE})` }],
    }));

  it('still reports invalid values next to ignored ones', () =>
    ruleTester.invalid({
      code: `a {
  display: -ms-flexbox;
  color: theme('colors.gray.400');
  border-bottom: 1px soild red;
}`,
      errors: [
        {
          text: `Unknown value "soild" for property "border-bottom" (${RULE})`,
          line: 4,
          column: 22,
          endColumn: 27,
        },
      ],
    }));

  it('does not report in SCSS files', () =>
    ruleTester.valid({ code: 'a { top: red; }', codeFilename: 'styles.scss' }));

  it('does not report in Sass files', () =>
    ruleTester.valid({ code: 'a\n  top: red', codeFilename: 'styles.sass' }));

  it('does not report in Less files', () =>
    ruleTester.valid({ code: 'a { top: red; }', codeFilename: 'styles.less' }));

  it('does not report inside a Vue <style lang="scss"> block', async () => {
    const code = `<template><div /></template>
<style lang="scss">
a { top: red; }
</style>`;
    const linter = new LinterWrapper();
    linter.initialize([{ key: RULE, configurations: [] }]);
    const { issues } = await linter.lint(vuePath, code);
    expect(issues).toHaveLength(0);
  });

  it('reports inside a Vue <style> block with plain CSS', () =>
    ruleTester.invalid({
      codeFilename: 'component.vue',
      code: `<template><div /></template>
<style>
a { top: red; }
</style>`,
      errors: [{ text: `Unknown value "red" for property "top" (${RULE})`, line: 3, column: 10 }],
    }));

  it('reports inside an HTML <style> block', () =>
    ruleTester.invalid({
      codeFilename: 'index.html',
      code: `<html><head><style>
a { top: red; }
</style></head></html>`,
      errors: [{ text: `Unknown value "red" for property "top" (${RULE})`, line: 2, column: 10 }],
    }));

  it('reports a separator that the property does not accept', () =>
    ruleTester.invalid({
      code: 'a { margin: 1px, 2px; }',
      errors: [
        {
          text: `Unknown value "," for property "margin" (${RULE})`,
          line: 1,
          column: 16,
          endColumn: 17,
        },
      ],
    }));

  it('reports the whole value when a required part is missing', () =>
    ruleTester.invalid({
      code: 'a { font: bold; }',
      errors: [{ text: `Unknown value "bold" for property "font" (${RULE})`, column: 11 }],
    }));

  it('ignores unknown properties and at-rule descriptors', () =>
    ruleTester.valid({
      code: `a { foo-bar: red; }
@font-face { font-display: foo; }
@media (min-width: 1px) { a { foo-bar: red; } }`,
    }));

  it('reports inside nesting at-rules', () =>
    ruleTester.invalid({
      code: '@media (min-width: 1px) { a { top: red; } }',
      errors: [{ text: `Unknown value "red" for property "top" (${RULE})` }],
    }));

  describe('parts of values that related rules cover', () => {
    it('does not check hex colors', async () => {
      expect(
        await lintWithRelatedRules('a { color: #ffw; top: #fff; color: rgb(1 2 #fff); }'),
      ).toEqual([['color-no-invalid-hex']]);
    });

    it('does not check numbers with a unit', async () => {
      expect(
        await lintWithRelatedRules(
          'a { margin: 1px 10pixels; width: 10x; top: 10deg; color: rgb(1 2 3foo); }',
        ),
      ).toEqual([['unit-no-unknown', 'unit-no-unknown', 'unit-no-unknown']]);
    });

    it('does not check the first argument of linear-gradient()', async () => {
      expect(
        await lintWithRelatedRules(
          'a { background: linear-gradient(top, #fff, #000); }',
          'a { background: linear-gradient(45, #fff, #000); }',
          'a { background: linear-gradient(to top top, #fff, #000); }',
          'a { background: linear-gradient(1px 2px); }',
          'a { background: linear-gradient(foo, #fff); }',
        ),
      ).toEqual([
        ['function-linear-gradient-no-nonstandard-direction'],
        ['function-linear-gradient-no-nonstandard-direction'],
        ['function-linear-gradient-no-nonstandard-direction'],
        ['function-linear-gradient-no-nonstandard-direction'],
        [],
      ]);
    });

    it('does not check values that are not valid CSS syntax', async () => {
      expect(
        await lintWithRelatedRules(
          'a { content: "first\nsecond"; }',
          'a { color: green !imprtant; }',
        ),
      ).toEqual([['string-no-newline'], ['sonar/annotation-no-unknown']]);
    });

    it('checks the other parts of the same value', async () => {
      expect(
        await lintWithRelatedRules(
          'a { background: linear-gradient(to left, foo, #ffw); }',
          'a { border: 1px soild #ffw; }',
          'a { color: rgb(1 foo 3foo); }',
          'a { image-resolution: 2x foo; }',
        ),
      ).toEqual([
        ['color-no-invalid-hex', RULE],
        ['color-no-invalid-hex', RULE],
        [RULE, 'unit-no-unknown'],
        [RULE],
      ]);
    });

    it('reports the rejected part next to a part covered by a related rule', () =>
      ruleTester.invalid({
        code: 'a { background: linear-gradient(to left, foo, #ffw); }',
        errors: [
          {
            text: `Unknown value "foo" for property "background" (${RULE})`,
            column: 42,
            endColumn: 45,
          },
        ],
      }));

    it('does not report when the first rejected part is covered by a related rule', async () => {
      expect(
        await lintWithRelatedRules(
          'a { background: linear-gradient(to left, #ffw, foo); }',
          'a { border: 1px #ffw soild; }',
          'a { margin: 1pz foo; }',
        ),
      ).toEqual([['color-no-invalid-hex'], ['color-no-invalid-hex'], ['unit-no-unknown']]);
    });

    it('checks the arguments of gradients other than the direction of linear-gradient()', async () => {
      expect(
        await lintWithRelatedRules(
          'a { background: repeating-linear-gradient(foo, #fff); }',
          'a { background: linear-gradient(45deg, foo, #000); }',
          'a { background: linear-gradient(in oklch, foo, #000); }',
          'a { background: linear-gradient(red, foo); }',
        ),
      ).toEqual([[RULE], [RULE], [RULE], [RULE]]);
    });
  });
});
