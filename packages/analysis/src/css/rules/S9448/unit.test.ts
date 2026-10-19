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
import stylelint from 'stylelint';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { createStylelintConfig } from '../../linter/config.js';
import { LinterWrapper } from '../../linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';
import { rule } from './rule.js';

const RULE = rule.ruleName;
const ruleTester = new StylelintRuleTester(RULE);
const vuePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'component.vue'));

function message(name: string): string {
  return `Replace this unknown "${name}" function with a known CSS function. (${RULE})`;
}

/** Lints the code with S9448 and the rules validating the values it does not check, S9424 and S8775 */
async function lintWithValueRules(code: string): Promise<string[]> {
  const config = createStylelintConfig(
    [
      RULE,
      'sonar/declaration-property-value-no-unknown',
      'at-rule-descriptor-value-no-unknown',
    ].map((key: string) => ({ key, configurations: [] })),
  );
  const { results } = await stylelint.lint({ code, codeFilename: 'test.css', config });
  return results[0].warnings.map(({ rule }) => rule);
}

describe('S9448 (sonar/function-no-unknown)', () => {
  it('reports an unknown function on its name only', () =>
    ruleTester.invalid({
      code: 'a { transform: unknown(1); }',
      errors: [{ text: message('unknown'), line: 1, column: 16, endLine: 1, endColumn: 23 }],
    }));

  it('reports a misspelled standard function', () =>
    ruleTester.invalid({
      code: 'a { background: linaer-gradient(red, blue); }',
      errors: [{ text: message('linaer-gradient'), column: 17, endColumn: 32 }],
    }));

  it('accepts standard functions regardless of case and vendor prefix', () =>
    ruleTester.valid({
      code: `a {
  transform: scale(1) rotateX(10deg) TRANSLATE(1px);
  background: -webkit-linear-gradient(red, blue), -khtml-gradient(linear, left top, left bottom, from(red), to(blue));
  width: -moz-calc(100% - 1px);
  color: rgb(0 0 0 / 50%);
}`,
    }));

  it('accepts custom functions', () =>
    ruleTester.valid({ code: 'a { width: --my-fn(1px); color: --Theme-Color(primary); }' }));

  it('reports unknown functions nested inside known ones', () =>
    ruleTester.invalid({
      code: 'a { width: calc(1px + fooo(2px)); color: var(--x, barr(1)); }',
      errors: [
        { text: message('fooo'), column: 23, endColumn: 27 },
        { text: message('barr'), column: 51, endColumn: 55 },
      ],
    }));

  it('reports a known function nesting an unknown one and every unknown function of a value', () =>
    ruleTester.invalid({
      code: 'a { transform: fooo(barr(1)) scale(bazz(2)); }',
      errors: [
        { text: message('fooo'), column: 16 },
        { text: message('barr'), column: 21 },
        { text: message('bazz'), column: 36 },
      ],
    }));

  it('reports unknown functions inside parentheses and brackets', () =>
    ruleTester.invalid({
      code: 'a { width: calc((1px + fooo(2px)) * 2); grid-template-columns: [barr(1)] 1fr; }',
      errors: [{ text: message('fooo') }, { text: message('barr') }],
    }));

  it('reports a vendor-prefixed unknown function', () =>
    ruleTester.invalid({
      code: 'a { width: -webkit-fooo(1px); }',
      errors: [{ text: message('-webkit-fooo'), column: 12 }],
    }));

  it('decodes escaped function names', () =>
    ruleTester.valid({ code: String.raw`a { color: r\67 b(0, 0, 0); }` }));

  it('reports an escaped unknown function with its decoded name on its source range', () =>
    ruleTester.invalid({
      code: String.raw`a { color: \66 ooo(1); }`,
      errors: [{ text: message('fooo'), column: 12, endColumn: 19 }],
    }));

  it('locates the function after comments inside the value', () =>
    ruleTester.invalid({
      code: 'a { color: red /* a long comment */ rgx(1); }',
      errors: [{ text: message('rgx'), column: 37, endColumn: 40 }],
    }));

  it('locates the function in a multi-line value', () =>
    ruleTester.invalid({
      code: `a {
  background: url(a.png) /* comment */
    no-repeat, bad-fn(1);
}`,
      errors: [{ text: message('bad-fn'), line: 3, column: 16, endLine: 3, endColumn: 22 }],
    }));

  it('still checks values with braces inside strings and URLs', () =>
    ruleTester.invalid({
      code: `a {
  content: "{page}" countr(chapter);
  background: url(img{1}.png) fooo(1);
}`,
      errors: [
        { text: message('countr'), line: 2 },
        { text: message('fooo'), line: 3 },
      ],
    }));

  it('ignores values with interpolation', () =>
    ruleTester.valid({ code: 'a { width: fooo(#{$x}); height: barr(@{y}); }' }));

  it('ignores custom property values, which are opaque until used', () =>
    ruleTester.valid({ code: 'a { --gradient: linaer-gradient(red, blue); }' }));

  it('checks the result values of if() but not its conditions', () =>
    ruleTester.invalid({
      code: 'a { color: if(style(--x: fooo(1)): barr(1); supports(color: bazz(1)): red; else: blue); }',
      errors: [{ text: message('barr'), column: 36 }],
    }));

  it('ignores legacy Internet Explorer filters', () =>
    ruleTester.valid({
      code: `a {
  filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src='a.png', sizingMethod='scale');
  -ms-filter: progid:DXImageTransform.Microsoft.BasicImage(rotation=1);
  filter: alpha(opacity=50);
}`,
    }));

  it('still reports unknown functions in modern filters', () =>
    ruleTester.invalid({
      code: 'a { filter: blurr(2px); }',
      errors: [{ text: message('blurr') }],
    }));

  it('accepts the iOS 11.0 constant() fallback of env()', () =>
    ruleTester.valid({
      code: 'a { padding-top: constant(safe-area-inset-top); padding-top: env(safe-area-inset-top); }',
    }));

  it('accepts standard functions missing from the function list', () =>
    ruleTester.valid({
      code: `a {
  background-image: src("a.png");
  opacity: media-progress(width from 0px to 100px);
  font-style: toggle(italic, normal);
}`,
    }));

  // Known limitation: IE-only CSS expressions are dropped by every browser that still matters
  it('reports Internet Explorer CSS expressions', () =>
    ruleTester.invalid({
      code: 'a { width: expression(document.body.clientWidth > 800 ? "800px" : "auto"); }',
      errors: [{ text: message('expression') }],
    }));

  it('reports inside keyframes and nesting at-rules', () =>
    ruleTester.invalid({
      code: `@keyframes spin { from { transform: rotat(1deg); } }
@media (min-width: 1px) { a { color: rgbb(1, 2, 3); } }
a { &:hover { color: rgbb(1, 2, 3); } }`,
      errors: [
        { text: message('rotat'), line: 1 },
        { text: message('rgbb'), line: 2 },
        { text: message('rgbb'), line: 3 },
      ],
    }));

  it('leaves at-rule descriptor values to S8775', () =>
    ruleTester.valid({
      code: `@font-face { src: url(a.woff2) tech(variations), fooo(a); }
@page { margin: fooo(1px); }
@position-try --x { top: fooo(1px); }`,
    }));

  describe('when S9424 and S8775 are active', () => {
    it('reports unknown functions only through S9448', async () => {
      expect(await lintWithValueRules('a { color: rgx(1); }')).toEqual([RULE]);
    });

    it('leaves invalid arguments of known functions to S9424', async () => {
      expect(await lintWithValueRules('a { color: rgb(1 2); }')).toEqual([
        'sonar/declaration-property-value-no-unknown',
      ]);
    });

    it('leaves unknown functions in descriptor values to S8775', async () => {
      expect(await lintWithValueRules('@font-face { src: fooo(a); }')).toEqual([
        'at-rule-descriptor-value-no-unknown',
      ]);
    });
  });

  describe('ignoreFunctions option', () => {
    const tester = new StylelintRuleTester(RULE, [true, { ignoreFunctions: ['Theme', '/^svg-/'] }]);

    it('accepts functions matching a name, regardless of case, or a regular expression', () =>
      tester.valid({
        code: 'a { color: theme(colors.red); background: svg-load("a.svg"), svg-inline(b); }',
      }));

    it('still reports other unknown functions', () =>
      tester.invalid({
        code: 'a { color: themes(colors.red); }',
        errors: [{ text: message('themes') }],
      }));

    it('matches an invalid regular expression as a plain name', () =>
      new StylelintRuleTester(RULE, [true, { ignoreFunctions: ['/(/'] }]).invalid({
        code: 'a { color: fooo(1); }',
        errors: [{ text: message('fooo') }],
      }));

    it('rejects options that are not strings', async () => {
      const config = createStylelintConfig([
        { key: RULE, configurations: [true, { ignoreFunctions: [1] }] },
      ]);
      const { results } = await stylelint.lint({
        code: 'a { color: fooo(1); }',
        codeFilename: 'test.css',
        config,
      });
      expect(results[0].invalidOptionWarnings).toHaveLength(1);
      expect(results[0].warnings).toHaveLength(0);
    });
  });

  describe('file languages', () => {
    it('does not report in SCSS files', () =>
      ruleTester.valid({ code: 'a { color: darken(red, 10%); }', codeFilename: 'styles.scss' }));

    it('does not report in Less files', () =>
      ruleTester.valid({ code: 'a { color: fade(red, 10%); }', codeFilename: 'styles.less' }));

    it('does not report inside a Vue <style lang="scss"> block', async () => {
      const linter = new LinterWrapper();
      linter.initialize([{ key: RULE, configurations: [] }]);
      const { issues } = await linter.lint(
        vuePath,
        `<template><div /></template>
<style lang="scss">
a { color: darken(red, 10%); }
</style>`,
      );
      expect(issues).toHaveLength(0);
    });

    it('accepts v-bind() but reports other unknown functions inside a Vue <style> block', () =>
      ruleTester.invalid({
        codeFilename: 'component.vue',
        code: `<template><div /></template>
<style scoped>
a { color: v-bind(color); width: fooo(1px); }
</style>`,
        errors: [{ text: message('fooo'), line: 3, column: 34 }],
      }));

    it('reports v-bind() outside Vue files', () =>
      ruleTester.invalid({
        code: 'a { color: v-bind(color); }',
        errors: [{ text: message('v-bind') }],
      }));

    it('reports inside an HTML <style> block', () =>
      ruleTester.invalid({
        codeFilename: 'index.html',
        code: `<html><head><style>
a { color: rgx(1); }
</style></head></html>`,
        errors: [{ text: message('rgx'), line: 2, column: 12 }],
      }));
  });
});
