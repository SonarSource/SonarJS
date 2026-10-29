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
import { meta } from './meta.js';
import { messages, rule } from './rule.js';

const RULE = rule.ruleName;
const ruleTester = new StylelintRuleTester(RULE);

async function warnings(code: string) {
  const config = createStylelintConfig([{ key: RULE, configurations: [] }]);
  const result = await stylelint.lint({ code, codeFilename: 'test.css', config });
  return result.results[0].warnings;
}

describe('S9442 (sonar/named-grid-areas-no-invalid)', (): void => {
  it('reports an empty string on that row', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template-areas: "header header" ""; }',
      errors: [{ text: `${messages.emptyString} (${RULE})`, line: 1, column: 42 }],
    }));

  it('reports a cell-count mismatch on the differing row', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template-areas: "header header" "main side foot"; }',
      errors: [{ text: `${messages.cellCount} (${RULE})`, line: 1, column: 42 }],
    }));

  it('reports a non-rectangular area on its first row', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template-areas: "main main" "main side"; }',
      errors: [{ text: `${messages.rectangle('main')} (${RULE})`, line: 1, column: 26 }],
    }));

  it('preserves the upstream warning ranges', async (): Promise<void> => {
    expect(
      (await warnings('a { grid-template-areas: "main main" "main side"; }')).map(
        ({ rule, column, endColumn }) => ({ rule, column, endColumn }),
      ),
    ).toEqual([{ rule: RULE, column: 26, endColumn: 37 }]);
  });

  it('accepts rectangular areas and single-period null cells', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid-template-areas: "head head" ". main"; }',
    }));

  it('accepts multi-period null cells', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid-template-areas: "... a" "b ..."; }',
    }));

  it('preserves warnings from a separately configured upstream rule', async (): Promise<void> => {
    const config = createStylelintConfig([
      { key: RULE, configurations: [] },
      { key: 'named-grid-areas-no-invalid', configurations: [] },
    ]);
    const result = await stylelint.lint({
      code: 'a { grid-template-areas: "... a" "b ..."; }',
      codeFilename: 'test.css',
      config,
    });
    expect(result.results[0].warnings.map(({ rule }) => rule)).toEqual([
      'named-grid-areas-no-invalid',
    ]);
  });

  it('preserves Stylelint option diagnostics from the upstream rule', async (): Promise<void> => {
    const config = createStylelintConfig([{ key: RULE, configurations: [42] }]);
    const result = await stylelint.lint({
      code: 'a { grid-template-areas: "a a" "a b"; }',
      codeFilename: 'test.css',
      config,
    });
    expect(result.results[0].invalidOptionWarnings).toHaveLength(1);
    expect(result.results[0].warnings).toHaveLength(0);
  });

  it('still reports named areas beside multi-period null cells', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template-areas: "a a ..." "a b ..."; }',
      errors: [{ text: `${messages.rectangle('a')} (${RULE})`, line: 1, column: 26 }],
    }));

  it('accepts null cells adjacent to named cells', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid-template-areas: "a.b" "a . b"; }',
    }));

  it('accepts escaped cell names', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid-template-areas: "\\61  a" "a a"; }',
    }));

  it('still reports when a row starts with a null cell', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template-areas: ". a" "a a"; }',
      errors: [{ text: `${messages.rectangle('a')} (${RULE})`, line: 1, column: 26 }],
    }));

  it('ignores unsupported syntax inside comments of the value', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template-areas: "a a" /* "x.y" */ "a b"; }',
      errors: [{ text: `${messages.rectangle('a')} (${RULE})`, line: 1, column: 26 }],
    }));

  it('still reports area strings in a grid-template with fractional sizes', (): Promise<void> =>
    ruleTester.invalid({
      code: 'a { grid-template: "a a" 1.5fr "a b" 1fr / 1fr 1fr; }',
      errors: [{ text: `${messages.rectangle('a')} (${RULE})`, line: 1 }],
    }));

  it('accepts a grid-template without area strings', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid-template: 100px 1fr / 1fr 1fr; }',
    }));

  it('accepts a grid shorthand without area strings', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid: auto-flow / 1fr 1fr; }',
    }));

  it('accepts a grid-template with line names and sizes', (): Promise<void> =>
    ruleTester.valid({
      code: 'a { grid-template: [top] 100px [middle] 1fr [bottom] / 1fr 1fr; }',
    }));

  it('honors disable comments for the Sonar rule', (): Promise<void> =>
    ruleTester.valid({
      code: `/* stylelint-disable-next-line ${RULE} */
a { grid-template-areas: "head head" ""; }`,
    }));

  it('does not honor disable comments for the upstream rule', (): Promise<void> =>
    ruleTester.invalid({
      code: `/* stylelint-disable-next-line named-grid-areas-no-invalid */
a { grid-template-areas: "head head" ""; }`,
      errors: [{ text: `${messages.emptyString} (${RULE})`, line: 2 }],
    }));

  it('keeps disable tracking independent when both rules are enabled', async (): Promise<void> => {
    const upstreamRule = meta.bindings[0].upstreamRule;
    const config = createStylelintConfig([
      { key: RULE, configurations: [] },
      { key: upstreamRule, configurations: [] },
    ]);
    config.reportNeedlessDisables = true;
    for (const disabled of [RULE, upstreamRule]) {
      const result = await stylelint.lint({
        code: `/* stylelint-disable-next-line ${disabled} */
a { grid-template-areas: "head head" ""; }`,
        codeFilename: 'test.css',
        config,
      });
      const expectedRule = disabled === RULE ? upstreamRule : RULE;
      expect(result.results[0].warnings.map(({ rule }) => rule)).toEqual([expectedRule]);
    }
  });
});
