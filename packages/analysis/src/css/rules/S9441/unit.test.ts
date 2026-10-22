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
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { rule, messages } from './rule.js';
import { describe, it } from 'node:test';

const SUFFIX = ` (${rule.ruleName})`;
const MISSING = `${messages.missing}${SUFFIX}`;
const BLOCKING = (value: string): string => `${messages.blocking(value)}${SUFFIX}`;

function fontFace(...descriptors: string[]): string {
  return ['@font-face {', ...descriptors.map((d: string): string => `  ${d}`), '}'].join('\n');
}

const FAMILY = 'font-family: "BodyText";';
const URL_SRC = 'src: url("body.woff2") format("woff2");';

const ruleTester = new StylelintRuleTester(rule.ruleName);

describe('S9441', () => {
  describe('compliant code', () => {
    for (const value of ['swap', 'fallback', 'optional', 'SWAP', 'Optional']) {
      it(`should accept font-display: ${value}`, () =>
        ruleTester.valid({ code: fontFace(FAMILY, URL_SRC, `font-display: ${value};`) }));
    }

    it('should not report font faces without a url() source', () =>
      ruleTester.valid({
        code: [
          fontFace(FAMILY, 'src: local("Body Text"), local("BodyText-Regular");'),
          fontFace(FAMILY, 'src: local("Body Text");', 'font-display: block;'),
          fontFace(FAMILY),
          fontFace(FAMILY, 'font-display: auto;'),
        ].join('\n'),
      }));

    it('should not report fonts embedded as data URLs', () =>
      ruleTester.valid({
        code: [
          fontFace(FAMILY, 'src: url(data:font/woff2;base64,d09GMgABAAAAAA==) format("woff2");'),
          fontFace(FAMILY, 'src: url("data:font/woff2;base64,d09GMgABAAAAAA==");'),
          fontFace(
            FAMILY,
            'src: url( DATA:font/woff2;base64,d09GMgABAAAAAA== );',
            'font-display: block;',
          ),
        ].join('\n'),
      }));

    it('should not report empty or unresolvable sources', () =>
      ruleTester.valid({
        code: [
          fontFace(FAMILY, 'src: url();'),
          fontFace(FAMILY, 'src: var(--font-src);'),
          fontFace(FAMILY, 'src: local("Body Text"), var(--font-src);'),
        ].join('\n'),
      }));

    it('should not report values that cannot be resolved statically', () =>
      ruleTester.valid({
        code: [
          fontFace(FAMILY, URL_SRC, 'font-display: var(--display);'),
          fontFace(FAMILY, URL_SRC, 'font-display: foo;'),
          fontFace(FAMILY, URL_SRC, 'font-display: ;'),
        ].join('\n'),
      }));

    it('should accept descriptors written in any letter case or marked as important', () =>
      ruleTester.valid({
        code: [
          fontFace(FAMILY, 'SRC: URL("body.woff2");', 'FONT-DISPLAY: swap;'),
          fontFace(FAMILY, URL_SRC, 'font-display: swap !important;'),
        ].join('\n'),
      }));

    it('should not report an @font-face without a block', () =>
      ruleTester.valid({ code: '@font-face;' }));

    it('should use the last font-display declaration', () =>
      ruleTester.valid({
        code: fontFace(FAMILY, URL_SRC, 'font-display: block;', 'font-display: swap;'),
      }));

    it('should ignore font-display outside of @font-face', () =>
      ruleTester.valid({
        code: [
          '.a { font-display: block; }',
          '@media screen { .b { font-display: auto; } }',
          '@font-feature-values "BodyText" { font-display: block; src: url("a.woff2"); }',
          '@page { src: url("a.woff2"); }',
        ].join('\n'),
      }));

    it('should honor disable comments', () =>
      ruleTester.valid({
        code: [
          '/* stylelint-disable sonar/font-display-non-blocking */',
          fontFace(FAMILY, URL_SRC),
          fontFace(FAMILY, URL_SRC, 'font-display: block;'),
        ].join('\n'),
      }));

    it('should not report preprocessor blocks whose descriptors are not statically visible', async () => {
      await ruleTester.valid({
        codeFilename: 'test.scss',
        code: [
          '@font-face {',
          '  font-family: "A";',
          '  @include font-display-default;',
          '  src: url("a.woff2");',
          '}',
        ].join('\n'),
      });
      await ruleTester.valid({
        codeFilename: 'test.scss',
        code: [
          '@font-face {',
          '  font-family: "A";',
          '  src: url("a.woff2");',
          '  @if $fast { font-display: swap; }',
          '}',
        ].join('\n'),
      });
      await ruleTester.valid({
        codeFilename: 'test.less',
        code: [
          '@font-face {',
          '  font-family: "A";',
          '  src: url("a.woff2");',
          '  .display-swap();',
          '}',
        ].join('\n'),
      });
    });

    it('should accept resolved descriptors in preprocessors', async () => {
      await ruleTester.valid({
        codeFilename: 'test.scss',
        code: fontFace(FAMILY, 'src: url(#{$path}/a.woff2);', 'font-display: $display;'),
      });
      await ruleTester.valid({
        codeFilename: 'test.less',
        code: fontFace(FAMILY, 'src: url("@{path}/a.woff2");', 'font-display: swap;'),
      });
    });

    it('should accept font-display in embedded styles', () =>
      ruleTester.valid({
        codeFilename: 'test.html',
        code: `<style>\n${fontFace(FAMILY, URL_SRC, 'font-display: swap;')}\n</style>`,
      }));
  });

  describe('missing font-display', () => {
    it('should report the at-rule name', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC),
        errors: [{ text: MISSING, line: 1, column: 1, endLine: 1, endColumn: 11 }],
      }));

    it('should report unquoted and multiple sources', () =>
      ruleTester.invalid({
        code: [
          fontFace(FAMILY, 'src: url(body.woff2);'),
          fontFace(FAMILY, 'src: url(body.woff2) format("woff2"), url(body.woff) format("woff");'),
          fontFace(FAMILY, 'src: local("Body Text"), url(body.woff2);'),
          fontFace(FAMILY, 'src: url(data:font/woff2;base64,AAAA), url(body.woff2);'),
          fontFace(FAMILY, 'SRC: URL(body.woff2);'),
        ].join('\n'),
        errors: [
          { text: MISSING, line: 1 },
          { text: MISSING, line: 5 },
          { text: MISSING, line: 9 },
          { text: MISSING, line: 13 },
          { text: MISSING, line: 17 },
        ],
      }));

    it('should decide on the last src declaration', async () => {
      await ruleTester.invalid({
        code: [
          fontFace(FAMILY, 'src: local("Body Text");', URL_SRC),
          fontFace(FAMILY, 'src: url(data:font/woff2;base64,AAAA);', URL_SRC),
          fontFace(FAMILY, 'src: url(body.eot);', URL_SRC),
        ].join('\n'),
        errors: [
          { text: MISSING, line: 1 },
          { text: MISSING, line: 6 },
          { text: MISSING, line: 11 },
        ],
      });
      await ruleTester.valid({
        code: [
          fontFace(FAMILY, URL_SRC, 'src: local("Body Text");'),
          fontFace(FAMILY, URL_SRC, 'src: url(data:font/woff2;base64,AAAA);'),
          fontFace(FAMILY, URL_SRC, 'src: var(--font-src);'),
        ].join('\n'),
      });
    });

    it('should report an @font-face without font-family', () =>
      ruleTester.invalid({
        code: fontFace(URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      }));

    it('should report any letter case of the at-rule', () =>
      ruleTester.invalid({
        code: '@FONT-FACE {\n  src: url(a.woff2);\n}',
        errors: [{ text: MISSING, line: 1, column: 1, endLine: 1, endColumn: 11 }],
      }));

    it('should report an indented at-rule from its @ sign', () =>
      ruleTester.invalid({
        code: '@media screen {\n    @font-face {\n      src: url(a.woff2);\n    }\n}',
        errors: [{ text: MISSING, line: 2, column: 5, endLine: 2, endColumn: 15 }],
      }));

    it('should ignore comments inside the block', () =>
      ruleTester.invalid({
        code: fontFace('/* font-display: swap; */', URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      }));

    it('should report in preprocessors when descriptors are plain', async () => {
      await ruleTester.invalid({
        codeFilename: 'test.scss',
        code: fontFace(FAMILY, 'src: url(#{$path}/a.woff2);'),
        errors: [{ text: MISSING, line: 1 }],
      });
      await ruleTester.invalid({
        codeFilename: 'test.less',
        code: fontFace(FAMILY, 'src: url("@{path}/a.woff2");'),
        errors: [{ text: MISSING, line: 1 }],
      });
    });

    it('should report in embedded styles', () =>
      ruleTester.invalid({
        codeFilename: 'test.html',
        code: `<style>\n${fontFace(FAMILY, URL_SRC)}\n</style>`,
        errors: [{ text: MISSING, line: 2, column: 1, endLine: 2, endColumn: 11 }],
      }));
  });

  describe('blocking font-display', () => {
    it('should report block on its value', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'font-display: block;'),
        errors: [{ text: BLOCKING('block'), line: 4, column: 17, endLine: 4, endColumn: 22 }],
      }));

    it('should report auto on its value', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'font-display: auto;'),
        errors: [{ text: BLOCKING('auto'), line: 4, column: 17, endLine: 4, endColumn: 21 }],
      }));

    it('should report important declarations on their value', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'font-display: block !important;'),
        errors: [{ text: BLOCKING('block'), line: 4, column: 17, endLine: 4, endColumn: 22 }],
      }));

    it('should report values in any letter case', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'Font-Display: BLOCK;'),
        errors: [{ text: BLOCKING('block'), line: 4, column: 17, endLine: 4, endColumn: 22 }],
      }));

    it('should locate the value when the declaration is spaced differently', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'font-display :   block ;'),
        errors: [{ text: BLOCKING('block'), line: 4, column: 20, endLine: 4, endColumn: 25 }],
      }));

    it('should report the last font-display declaration', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'font-display: swap;', 'font-display: auto;'),
        errors: [{ text: BLOCKING('auto'), line: 5 }],
      }));

    it('should report each font face', () =>
      ruleTester.invalid({
        code: [
          fontFace(FAMILY, URL_SRC, 'font-display: block;'),
          fontFace(FAMILY, URL_SRC, 'font-display: swap;'),
          fontFace(FAMILY, URL_SRC),
          fontFace(FAMILY, URL_SRC, 'font-display: auto;'),
        ].join('\n'),
        errors: [
          { text: BLOCKING('block'), line: 4 },
          { text: MISSING, line: 11 },
          { text: BLOCKING('auto'), line: 18 },
        ],
      }));

    it('should not include trailing comments in the highlighted value', () =>
      ruleTester.invalid({
        code: fontFace(FAMILY, URL_SRC, 'font-display: block /* intended */;'),
        errors: [{ text: BLOCKING('block'), line: 4, column: 17, endLine: 4, endColumn: 22 }],
      }));

    it('should report block in embedded styles', () =>
      ruleTester.invalid({
        codeFilename: 'test.html',
        code: `<style>\n${fontFace(FAMILY, URL_SRC, 'font-display: block;')}\n</style>`,
        errors: [{ text: BLOCKING('block'), line: 5, column: 17 }],
      }));
  });

  describe('ignoreFontFamilies', () => {
    const ignoring = new StylelintRuleTester(rule.ruleName, [
      true,
      { ignoreFontFamilies: ['Icons', '/^Material/i', 'Font Awesome'] },
    ]);

    it('should ignore listed families whatever their quoting and case', async () => {
      await ignoring.valid({ code: fontFace('font-family: "Icons";', URL_SRC) });
      await ignoring.valid({
        code: fontFace("font-family: 'icons';", URL_SRC, 'font-display: block;'),
      });
      await ignoring.valid({ code: fontFace('font-family: ICONS;', URL_SRC) });
      await ignoring.valid({ code: fontFace('font-family: Font Awesome;', URL_SRC) });
      await ignoring.valid({ code: fontFace('font-family: "Font Awesome";', URL_SRC) });
    });

    it('should ignore families matching a regular expression', async () => {
      await ignoring.valid({ code: fontFace('font-family: "Material Icons";', URL_SRC) });
      await ignoring.valid({ code: fontFace('font-family: materialsymbols;', URL_SRC) });
    });

    it('should not depend on the previous match for regular expressions with the global flag', async () => {
      const global = new StylelintRuleTester(rule.ruleName, [
        true,
        { ignoreFontFamilies: ['/Icons/g'] },
      ]);
      await global.valid({
        code: [
          fontFace('font-family: "Icons One";', URL_SRC),
          fontFace('font-family: "Icons Two";', URL_SRC),
        ].join('\n'),
      });
    });

    it('should compare invalid regular expressions as plain strings', async () => {
      const invalid = new StylelintRuleTester(rule.ruleName, [
        true,
        { ignoreFontFamilies: ['/(/', '/Icons/zz'] },
      ]);
      await invalid.valid({ code: fontFace('font-family: "/(/";', URL_SRC) });
      await invalid.invalid({
        code: fontFace('font-family: "Icons";', URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      });
    });

    it('should match unquoted names whatever their spacing and comments', async () => {
      await ignoring.valid({ code: fontFace('font-family: Font   Awesome;', URL_SRC) });
      await ignoring.valid({ code: fontFace('font-family: Font\n    Awesome;', URL_SRC) });
      await ignoring.valid({ code: fontFace('font-family: Font /* icons */ Awesome;', URL_SRC) });
    });

    it('should take quoted names verbatim', async () => {
      await ignoring.invalid({
        code: fontFace('font-family: "Font  Awesome";', URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      });
    });

    it('should not match escaped names', async () => {
      // known limitation: CSS escapes such as `Font\ Awesome` are compared as written
      await ignoring.invalid({
        code: fontFace(String.raw`font-family: Font\ Awesome;`, URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      });
    });

    it('should keep reporting other families', async () => {
      await ignoring.invalid({
        code: fontFace('font-family: "Icons Extra";', URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      });
      await ignoring.invalid({
        code: fontFace('font-family: "My Material";', URL_SRC, 'font-display: block;'),
        errors: [{ text: BLOCKING('block'), line: 4 }],
      });
      await ignoring.invalid({
        code: fontFace(URL_SRC),
        errors: [{ text: MISSING, line: 1 }],
      });
    });
  });
});
