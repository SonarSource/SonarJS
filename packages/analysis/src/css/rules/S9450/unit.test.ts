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
import { meta } from './meta.js';

const RULE = meta.bindings[0].stylelintKey;
const ruleTester = new StylelintRuleTester(RULE);

function issue(
  property: string,
  line: number,
  column: number = 3,
): {
  text: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
} {
  return {
    text: `${messages.duplicate(property)} (${RULE})`,
    line,
    column,
    endLine: line,
    endColumn: column + property.length,
  };
}

const duplicate = `a {
  --color: pink;
  --color: orange; /* Noncompliant */
/*^^^^^^^*/
}`;

describe('S9450 (sonar/declaration-block-no-duplicate-custom-properties)', (): void => {
  it('reports the property name using the selected message', (): Promise<void> =>
    ruleTester.invalid({ code: duplicate, errors: [issue('--color', 3)] }));

  for (const [first, second] of [
    ['orange', 'orange'],
    ['pink !important', 'orange'],
    ['pink', 'orange !important'],
    ['pink !important', 'orange !important'],
  ]) {
    it(`reports duplicates regardless of values or importance: ${first}, ${second}`, (): Promise<void> =>
      ruleTester.invalid({
        code: `a {
  --color: ${first};
  --color: ${second}; /* Noncompliant */
/*^^^^^^^*/
}`,
        errors: [issue('--color', 3)],
      }));
  }

  it('reports nonadjacent duplicates and every subsequent declaration', (): Promise<void> =>
    ruleTester.invalid({
      code: `a {
  --color: pink;
  color: var(--color);
  --color: orange; /* Noncompliant */
/*^^^^^^^*/
  --color: blue; /* Noncompliant */
/*^^^^^^^*/
}`,
      errors: [issue('--color', 4), issue('--color', 6)],
    }));

  for (const code of [
    'a { --color: orange; }',
    'a { color: pink; color: orange; }',
    'a { --color: pink; --Color: orange; }',
    'a { --color: pink; } b { --color: orange; }',
    'a { --color: pink; & b { --color: orange; } }',
    '@media screen { a { --color: pink; } } a { --color: orange; }',
    '/* --color: pink; --color: orange; */ a { content: "--color: pink; --color: orange"; }',
    String.raw`a { --color: pink; --c\6flor: orange; }`,
  ]) {
    it(`accepts distinct declarations or lookalikes: ${code}`, (): Promise<void> =>
      ruleTester.valid({ code }));
  }

  it('keeps the parent declaration set across independent nested blocks', (): Promise<void> =>
    ruleTester.invalid({
      code: `a {
  --color: pink;
  & b {
    --color: orange;
    --color: blue; /* Noncompliant */
  /*^^^^^^^*/
  }
  --color: green; /* Noncompliant */
/*^^^^^^^*/
}`,
      errors: [issue('--color', 5, 5), issue('--color', 8)],
    }));

  it('compares identical escaped names without normalizing the spelling', (): Promise<void> =>
    ruleTester.invalid({
      code: String.raw`a {
  --c\6flor: pink;
  --c\6flor: orange; /* Noncompliant */
/*^^^^^^^^^*/
}`,
      errors: [issue(String.raw`--c\6flor`, 3)],
    }));

  it('preserves the upstream limitation for escaped leading hyphens', (): Promise<void> =>
    ruleTester.valid({
      code: String.raw`a {
  \2d\2d color: red;
  \2d\2d color: blue;
}`,
    }));

  for (const keyframes of ['keyframes', '-webkit-keyframes', 'KEYFRAMES']) {
    for (const values of [
      ['red !important', 'blue'],
      ['red', 'blue !important'],
      ['red !important', 'blue !important'],
    ]) {
      it(`ignores ineffective keyframe declarations in @${keyframes}: ${values}`, (): Promise<void> =>
        ruleTester.valid({
          code: `@${keyframes} pulse {
  from {
    --color: ${values[0]};
    --color: ${values[1]};
  }
}`,
        }));
    }

    it(`reports effective duplicates in @${keyframes}`, (): Promise<void> =>
      ruleTester.invalid({
        code: `@${keyframes} pulse {
  from {
    --color: red !important;
    --color: blue;
    --color: pink !important;
    --color: green; /* Noncompliant */
  /*^^^^^^^*/
    --color: orange; /* Noncompliant */
  /*^^^^^^^*/
  }
}`,
        errors: [issue('--color', 6, 5), issue('--color', 8, 5)],
      }));
  }

  it('keeps effective declaration sets separate for keyframe selectors', (): Promise<void> =>
    ruleTester.valid({
      code: `@keyframes pulse {
  from { --color: red !important; --color: blue; }
  to { --color: green; }
}`,
    }));

  it('preserves S4655 warnings when ignoring ineffective keyframe duplicates', async (): Promise<void> => {
    const config = createStylelintConfig(
      [RULE, 'keyframe-declaration-no-important'].map(
        (key: string): { key: string; configurations: [] } => ({ key, configurations: [] }),
      ),
    );
    const {
      results: [{ warnings }],
    } = await stylelint.lint({
      codeFilename: 'test.css',
      code: `@keyframes pulse {
  from {
    --color: red !important;
    --color: blue;
  }
  to {
    --color: red;
    --color: blue !important;
  }
}`,
      config,
    });
    expect(
      warnings.map((warning: stylelint.Warning): [string, number] => [warning.rule, warning.line]),
    ).toEqual([
      ['keyframe-declaration-no-important', 3],
      ['keyframe-declaration-no-important', 8],
    ]);
  });

  it('supports exact and regular expression exclusions without ignoring unmatched names', async (): Promise<void> => {
    const configured = new StylelintRuleTester(RULE, [
      true,
      { ignoreProperties: ['--color', '/^--theme-/'] },
    ]);
    await configured.invalid({
      code: `a {
  --color: pink;
  --color: orange;
  --theme-main: pink;
  --theme-main: orange;
  --Color: pink;
  --Color: orange; /* Noncompliant */
/*^^^^^^^*/
  --other: pink;
  --other: orange; /* Noncompliant */
/*^^^^^^^*/
}`,
      errors: [issue('--Color', 7), issue('--other', 10)],
    });
  });

  it('keeps reporting with an empty exclusion list', (): Promise<void> =>
    new StylelintRuleTester(RULE, [true, { ignoreProperties: [] }]).invalid({
      code: duplicate,
      errors: [issue('--color', 3)],
    }));

  for (const extension of ['scss', 'less']) {
    const interpolation = extension === 'scss' ? '#{$name}' : '@{name}';
    it(`ignores interpolated properties but reports ordinary duplicates in ${extension}`, (): Promise<void> =>
      ruleTester.invalid({
        codeFilename: `styles.${extension}`,
        code: `a {
  --${interpolation}: pink;
  --${interpolation}: orange;
  --color: pink;
  --color: orange; /* Noncompliant */
/*^^^^^^^*/
}`,
        errors: [issue('--color', 5)],
      }));
  }

  for (const extension of ['html', 'vue']) {
    it(`reports duplicates in ${extension} style blocks`, (): Promise<void> =>
      ruleTester.invalid({
        codeFilename: `component.${extension}`,
        code: `<style>
${duplicate}
</style>`,
        errors: [issue('--color', 4)],
      }));
  }

  it('reports duplicates in HTML style attributes', (): Promise<void> =>
    ruleTester.invalid({
      codeFilename: 'page.html',
      code: `<p style="--color: pink; --color: orange">text</p> <!-- Noncompliant -->
<!--                     ^^^^^^^ -->`,
      errors: [issue('--color', 1, 26)],
    }));

  for (const directive of [
    'stylelint-disable',
    `stylelint-disable ${RULE}`,
    `stylelint-disable-next-line ${RULE}`,
  ]) {
    it(`honors ${directive}`, (): Promise<void> =>
      ruleTester.valid({ code: `/* ${directive} */\na { --color: pink; --color: orange; }` }));
  }

  it('resumes reporting after a named enable comment', (): Promise<void> =>
    ruleTester.invalid({
      code: `/* stylelint-disable ${RULE} */
a { --color: pink; --color: orange; }
/* stylelint-enable ${RULE} */
${duplicate}`,
      errors: [issue('--color', 6)],
    }));

  it('ignores disables for unrelated rules', (): Promise<void> =>
    ruleTester.invalid({
      code: `/* stylelint-disable-next-line declaration-block-no-duplicate-properties */
${duplicate}`,
      errors: [issue('--color', 4)],
    }));

  it('preserves simultaneous warnings from S4656 and S9423', async (): Promise<void> => {
    const config = createStylelintConfig(
      [RULE, 'declaration-block-no-duplicate-properties', 'sonar/declaration-no-important'].map(
        (key: string): { key: string; configurations: [] } => ({ key, configurations: [] }),
      ),
    );
    const {
      results: [{ warnings }],
    } = await stylelint.lint({
      codeFilename: 'test.css',
      code: `a {
  --color: pink;
  --color: orange; /* Noncompliant S9450 */
/*^^^^^^^*/
  color: pink; /* Noncompliant S4656 */
/*^^^^^*/
  color: orange;
  margin: 0 !important; /* Noncompliant S9423 */
/*          ^^^^^^^^^^*/
}`,
      config,
    });
    expect(
      warnings
        .map((warning: stylelint.Warning): [string, number] => [warning.rule, warning.line])
        .sort(),
    ).toEqual(
      [
        ['declaration-block-no-duplicate-properties', 5],
        [RULE, 3],
        ['sonar/declaration-no-important', 8],
      ].sort(),
    );
  });

  it('preserves invalid option diagnostics', async (): Promise<void> => {
    const config = createStylelintConfig([
      { key: RULE, configurations: [true, { ignoreProperties: [42] }] },
    ]);
    const {
      results: [{ invalidOptionWarnings, warnings }],
    } = await stylelint.lint({
      code: duplicate,
      codeFilename: 'test.css',
      config,
    });
    expect(invalidOptionWarnings).toHaveLength(1);
    expect(warnings).toHaveLength(0);
  });

  it('does not automatically remove a declaration', async (): Promise<void> => {
    const config = createStylelintConfig([{ key: RULE, configurations: [] }]);
    const result = await stylelint.lint({
      code: duplicate,
      codeFilename: 'test.css',
      config,
      fix: true,
    });
    expect(result.code).toBe(duplicate);
    expect(result.results[0].warnings).toHaveLength(1);
  });
});
