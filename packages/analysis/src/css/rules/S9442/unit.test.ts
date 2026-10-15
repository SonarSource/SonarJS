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
import { withSonarDisables } from '../helpers/decorated-result.js';
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

  it('isolates upstream disable ranges from the shared result', async (): Promise<void> => {
    const config = createStylelintConfig([{ key: RULE, configurations: [] }]);
    const sonarDisabled = await stylelint.lint({
      code: `/* stylelint-disable-next-line ${RULE} */
a { grid-template-areas: "head head" ""; }`,
      codeFilename: 'test.css',
      config,
    });
    const sharedResult = sonarDisabled.results[0]._postcssResult;
    if (!sharedResult) {
      throw new Error('Expected a PostCSS result');
    }
    const originalRanges = sharedResult.stylelint.disabledRanges;
    originalRanges[RULE][0].rules = [RULE];
    const scopedResult = withSonarDisables(sharedResult, RULE, 'named-grid-areas-no-invalid');
    expect(scopedResult.stylelint.disabledRanges).not.toBe(originalRanges);
    for (const [rule, ranges] of Object.entries(originalRanges)) {
      expect(scopedResult.stylelint.disabledRanges[rule]).not.toBe(ranges);
      expect(scopedResult.stylelint.disabledRanges[rule]).toEqual(ranges);
    }
    const scopedRanges = scopedResult.stylelint.disabledRanges['named-grid-areas-no-invalid'];
    expect(scopedRanges).toEqual(originalRanges[RULE]);
    expect(scopedRanges).not.toBe(originalRanges[RULE]);
    expect(scopedRanges[0]).not.toBe(originalRanges[RULE][0]);
    expect(scopedRanges[0].rules).not.toBe(originalRanges[RULE][0].rules);
    scopedRanges[0].start = 99;
    scopedRanges[0].rules?.push('another-rule');
    expect(originalRanges[RULE][0].start).toBe(2);
    expect(originalRanges[RULE][0].rules).toEqual([RULE]);
    expect(sharedResult.stylelint.disabledRanges).toBe(originalRanges);
    expect(sharedResult.stylelint.disabledRanges['named-grid-areas-no-invalid']).toBeUndefined();

    const upstreamDisabled = await stylelint.lint({
      code: `/* stylelint-disable-next-line named-grid-areas-no-invalid */
a { grid-template-areas: "head head" ""; }`,
      codeFilename: 'test.css',
      config,
    });
    expect(
      upstreamDisabled.results[0]._postcssResult?.stylelint.disabledRanges[
        'named-grid-areas-no-invalid'
      ]?.map(({ start, end }) => ({ start, end })),
    ).toEqual([{ start: 2, end: 2 }]);
  });
});
