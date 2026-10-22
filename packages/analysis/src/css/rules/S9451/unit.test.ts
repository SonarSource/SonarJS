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
// https://sonarsource.github.io/rspec/#/rspec/S9451/css
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { LinterWrapper } from '../../linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';
import { rule } from './rule.js';

const RULE = rule.ruleName;
const ruleTester = new StylelintRuleTester(RULE);
const vuePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'component.vue'));

const NBSP = '\u00A0';
const ZWSP = '\u200B';

function replace(character: string): string {
  return `Replace this ${character} with ordinary whitespace. (${RULE})`;
}

function remove(character: string): string {
  return `Remove this ${character}. (${RULE})`;
}

const SPACE_CHARACTERS = [
  ['\u000B', 'U+000B LINE TABULATION'],
  ['\u0085', 'U+0085 NEXT LINE'],
  ['\u00A0', 'U+00A0 NO-BREAK SPACE'],
  ['\u1680', 'U+1680 OGHAM SPACE MARK'],
  ['\u2000', 'U+2000 EN QUAD'],
  ['\u2001', 'U+2001 EM QUAD'],
  ['\u2002', 'U+2002 EN SPACE'],
  ['\u2003', 'U+2003 EM SPACE'],
  ['\u2004', 'U+2004 THREE-PER-EM SPACE'],
  ['\u2005', 'U+2005 FOUR-PER-EM SPACE'],
  ['\u2006', 'U+2006 SIX-PER-EM SPACE'],
  ['\u2007', 'U+2007 FIGURE SPACE'],
  ['\u2008', 'U+2008 PUNCTUATION SPACE'],
  ['\u2009', 'U+2009 THIN SPACE'],
  ['\u200A', 'U+200A HAIR SPACE'],
  ['\u2028', 'U+2028 LINE SEPARATOR'],
  ['\u2029', 'U+2029 PARAGRAPH SEPARATOR'],
  ['\u202F', 'U+202F NARROW NO-BREAK SPACE'],
  ['\u205F', 'U+205F MEDIUM MATHEMATICAL SPACE'],
  ['\u3000', 'U+3000 IDEOGRAPHIC SPACE'],
];

const ZERO_WIDTH_CHARACTERS = [
  ['\u180E', 'U+180E MONGOLIAN VOWEL SEPARATOR'],
  ['\u200B', 'U+200B ZERO WIDTH SPACE'],
  ['\uFEFF', 'U+FEFF ZERO WIDTH NO-BREAK SPACE'],
];

describe('S9451 (sonar/no-irregular-whitespace)', () => {
  it('reports a no-break space in a selector and in a declaration value', () =>
    ruleTester.invalid({
      code: `.menu${NBSP}.item {
  padding: 8px${NBSP}16px;
}`,
      errors: [
        {
          text: replace('U+00A0 NO-BREAK SPACE'),
          line: 1,
          column: 6,
          endLine: 1,
          endColumn: 7,
        },
        {
          text: replace('U+00A0 NO-BREAK SPACE'),
          line: 2,
          column: 15,
          endLine: 2,
          endColumn: 16,
        },
      ],
    }));

  for (const [character, description] of SPACE_CHARACTERS) {
    it(`asks to replace ${description}`, () =>
      ruleTester.invalid({
        code: `a {${character}color: red; }`,
        errors: [{ text: replace(description), column: 4, endColumn: 5 }],
      }));
  }

  for (const [character, description] of ZERO_WIDTH_CHARACTERS) {
    it(`asks to remove ${description}`, () =>
      ruleTester.invalid({
        code: `a${character} { color: red; }`,
        errors: [{ text: remove(description), column: 2, endColumn: 3 }],
      }));
  }

  it('accepts the whitespace of CSS, including form feeds and carriage returns', () =>
    ruleTester.valid({ code: '.a\f.b\t.c {\r\n  color: red;\n}\r\n' }));

  it('reports in property names, at-rule preludes and custom property values', () =>
    ruleTester.invalid({
      code: `a { margin${NBSP}: 0; --gap: 1px${NBSP}2px; }
@media screen${NBSP}and (min-width: 1px) {}`,
      errors: [
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 1, column: 11 },
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 1, column: 27 },
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 2, column: 14 },
      ],
    }));

  it('ignores comments, including comments inside at-rule preludes', () =>
    ruleTester.valid({
      code: `/* a${NBSP}b${ZWSP} */
@media /* x${NBSP}y */ screen {}
a { color: red /* x${NBSP}y */; }`,
    }));

  it('ignores quoted strings', () =>
    ruleTester.valid({
      code: `a::after { content: "10${NBSP}km"; font-family: 'Open${NBSP}Sans'; }
[title="a${NBSP}b"] {}`,
    }));

  it('ignores quoted and unquoted URLs', () =>
    ruleTester.valid({
      code: `a { background: url(x${NBSP}y.png), url("x${NBSP}y.png"), url( x${NBSP}y.png ); }
@import url(x${NBSP}y.css);`,
    }));

  it('ignores escape sequences', () =>
    ruleTester.valid({
      code: `a::before { content: "\\a0"; } .a\\a0 b {} .c\\${NBSP}d {}`,
    }));

  it('reports a character outside a string at its own position', () =>
    ruleTester.invalid({
      code: `a { content: "x${NBSP}${NBSP}y"${ZWSP}; }`,
      errors: [{ text: remove('U+200B ZERO WIDTH SPACE'), column: 20, endColumn: 21 }],
    }));

  it('locates every character after repeated characters and across lines', () =>
    ruleTester.invalid({
      code: `a${NBSP}${NBSP}${ZWSP}b {
  color:${NBSP}/* x${NBSP}y */${NBSP}red;
}`,
      errors: [
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 1, column: 2, endColumn: 3 },
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 1, column: 3, endColumn: 4 },
        { text: remove('U+200B ZERO WIDTH SPACE'), line: 1, column: 4, endColumn: 5 },
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 2, column: 9, endColumn: 10 },
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 2, column: 19, endColumn: 20 },
      ],
    }));

  it('reports in the strings of grid area definitions', () =>
    ruleTester.invalid({
      code: `a {
  grid-template-areas: "head head" "nav${NBSP}main";
  grid-template: "a${ZWSP} b" 1fr / auto;
  GRID: "c${NBSP}d" / 1fr 1fr;
}`,
      errors: [
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 2, column: 40 },
        { text: remove('U+200B ZERO WIDTH SPACE'), line: 3, column: 20 },
        { text: replace('U+00A0 NO-BREAK SPACE'), line: 4, column: 11 },
      ],
    }));

  it('locates grid area strings after comments and line breaks in the value', () =>
    ruleTester.invalid({
      code: `a {
  grid-template-areas: /* areas */
    "a b"
    "c${NBSP}d";
}`,
      errors: [{ text: replace('U+00A0 NO-BREAK SPACE'), line: 4, column: 7 }],
    }));

  it('ignores escape sequences in grid area strings', () =>
    ruleTester.valid({ code: `a { grid-template-areas: "a\\a0 b" "c\\${NBSP}d"; }` }));

  it('accepts a byte order mark at the start of the file only', () =>
    ruleTester.invalid({
      code: `\uFEFFa {}\nb\uFEFF {}`,
      errors: [{ text: remove('U+FEFF ZERO WIDTH NO-BREAK SPACE'), line: 2, column: 2 }],
    }));

  describe('file languages', () => {
    it('does not report in SCSS files', () =>
      ruleTester.valid({
        code: `// a${NBSP}b\na { color: red; }`,
        codeFilename: 'styles.scss',
      }));

    it('does not report in Less files', () =>
      ruleTester.valid({
        code: `// a${NBSP}b\na { color: red; }`,
        codeFilename: 'styles.less',
      }));

    it('does not report inside a Vue <style lang="scss"> block', async () => {
      const linter = new LinterWrapper();
      linter.initialize([{ key: RULE, configurations: [] }]);
      const { issues } = await linter.lint(
        vuePath,
        `<template><div /></template>
<style lang="scss">
// a${NBSP}b
a { color: red; }
</style>`,
      );
      expect(issues).toHaveLength(0);
    });

    it('reports inside a Vue <style> block', () =>
      ruleTester.invalid({
        codeFilename: 'component.vue',
        code: `<template><div>a${NBSP}b</div></template>
<style scoped>
a {${NBSP}color: red; }
</style>`,
        errors: [{ text: replace('U+00A0 NO-BREAK SPACE'), line: 3, column: 4 }],
      }));

    it('reports inside HTML <style> blocks and style attributes, but not in the markup', () =>
      ruleTester.invalid({
        codeFilename: 'index.html',
        code: `<html><head><style>
a {${NBSP}color: red; }
</style></head><body>
<p title="a${NBSP}b">c${NBSP}d</p>
<div style="color:${NBSP}red"></div>
</body></html>`,
        errors: [
          { text: replace('U+00A0 NO-BREAK SPACE'), line: 2, column: 4 },
          { text: replace('U+00A0 NO-BREAK SPACE'), line: 5, column: 19 },
        ],
      }));

    it('locates grid area strings inside an HTML <style> block', () =>
      ruleTester.invalid({
        codeFilename: 'index.html',
        code: `<html><head><style>
a { color: red; }
b {
  grid-template-areas: "a a"
    "b${NBSP}c";
}
</style></head></html>`,
        errors: [{ text: replace('U+00A0 NO-BREAK SPACE'), line: 5, column: 7, endColumn: 8 }],
      }));
  });
});
