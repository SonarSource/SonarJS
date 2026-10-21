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
import { meta } from './meta.js';
import { messages } from './rule.js';

const { stylelintKey: RULE, upstreamRule: UPSTREAM_RULE } = meta.bindings[0];
const UNIT_RULE = 'unit-no-unknown';
const text = (value: string, name: string): string => `${messages.rejected(value, name)} (${RULE})`;

const ruleTester = new StylelintRuleTester(RULE);
const vuePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'component.vue'));

async function lint(
  code: string,
  rules: { key: string; configurations: unknown[] }[],
): Promise<stylelint.LintResult> {
  const config = createStylelintConfig(rules);
  const { results } = await stylelint.lint({ code, codeFilename: 'test.css', config });
  return results[0];
}

async function reportedRules(code: string, rules: string[]): Promise<string[]> {
  const { warnings } = await lint(
    code,
    rules.map(key => ({ key, configurations: [] })),
  );
  return warnings.map(({ rule }) => rule);
}

describe('S9452 (sonar/media-feature-name-value-no-unknown)', () => {
  it('accepts values matching the media feature type', () =>
    ruleTester.valid({
      code: `@media (color: 8) {}
@media (width: 10px) {}
@media (min-width: 0) {}
@media (hover: hover) and (pointer: coarse) {}
@media (10px < width < 20px) {}
@media (min-resolution: 2x) {}
@media (aspect-ratio: 16 / 9) {}
@media (orientation: LANDSCAPE) {}
@media (-webkit-min-device-pixel-ratio: 2) {}
@media (width: env(--min)) {}
@media (width: calc(100px + 2em)) {}`,
    }));

  it('reports a keyword where the feature expects an integer', () =>
    ruleTester.invalid({
      code: '@media (color: red) { a { top: 1px; } }',
      errors: [{ text: text('red', 'color'), line: 1, column: 16, endColumn: 19 }],
    }));

  it('reports a number without unit where the feature expects a length', () =>
    ruleTester.invalid({
      code: '@media (width: 10) {}',
      errors: [{ text: text('10', 'width'), line: 1, column: 16, endColumn: 18 }],
    }));

  it('reports an unknown keyword for a discrete feature', () =>
    ruleTester.invalid({
      code: '@media (hover: pointer) {}',
      errors: [{ text: text('pointer', 'hover'), line: 1, column: 16, endColumn: 23 }],
    }));

  it('reports only the invalid bound of a range', () =>
    ruleTester.invalid({
      code: '@media (10px < width < 20s) {}',
      errors: [{ text: text('20s', 'width'), line: 1, column: 24, endColumn: 27 }],
    }));

  it('reports a known unit of the wrong category', () =>
    ruleTester.invalid({
      code: '@media (min-width: 10deg) {}',
      errors: [{ text: text('10deg', 'min-width'), line: 1, column: 20, endColumn: 25 }],
    }));

  it('keeps the author spelling of the feature and the value', () =>
    ruleTester.invalid({
      code: '@media (Hover: Pointer) {}',
      errors: [{ text: text('Pointer', 'Hover') }],
    }));

  it('reports every invalid feature of a media query list', () =>
    ruleTester.invalid({
      code: '@media screen and (color: red), print and (hover: pointer) {}',
      errors: [
        { text: text('red', 'color'), column: 27 },
        { text: text('pointer', 'hover'), column: 51 },
      ],
    }));

  it('reports nested media queries', () =>
    ruleTester.invalid({
      code: 'a { @media (orientation: up) { color: red; } }',
      errors: [{ text: text('up', 'orientation'), line: 1 }],
    }));

  it('leaves unknown feature names to S4661', () =>
    ruleTester.valid({ code: '@media (unknown-feature: red) {}' }));

  describe('values missing from the upstream tables', () => {
    it('accepts the window-controls-overlay display mode', () =>
      ruleTester.valid({ code: '@media (display-mode: window-controls-overlay) {}' }));

    it('still reports unknown display modes', () =>
      ruleTester.invalid({
        code: '@media (display-mode: windowed) {}',
        errors: [{ text: text('windowed', 'display-mode') }],
      }));

    it('keeps the missing values when ignored values are configured', async () => {
      const { warnings, invalidOptionWarnings } = await lint(
        `@media (display-mode: window-controls-overlay) {}
@media (display-mode: tabbed) {}
@media (hover: pointer) {}`,
        [
          {
            key: RULE,
            configurations: [true, { ignoreMediaFeatureNameValues: { hover: ['pointer'] } }],
          },
        ],
      );
      expect(invalidOptionWarnings).toHaveLength(0);
      expect(warnings.map(({ text }) => text)).toEqual([text('tabbed', 'display-mode')]);
    });

    it('merges configured ignored values for the same feature', () =>
      new StylelintRuleTester(RULE, [
        true,
        { ignoreMediaFeatureNameValues: { 'display-mode': ['tabbed'] } },
      ]).valid({
        code: `@media (display-mode: tabbed) {}
@media (display-mode: window-controls-overlay) {}`,
      }));

    it('preserves Stylelint option diagnostics from the upstream rule', async () => {
      const { warnings, invalidOptionWarnings } = await lint('@media (color: red) {}', [
        { key: RULE, configurations: [42] },
      ]);
      expect(invalidOptionWarnings).toHaveLength(1);
      expect(warnings).toHaveLength(0);
    });
  });

  describe('math functions for boolean features', () => {
    it('accepts calculations, which can resolve to 0 or 1', () =>
      ruleTester.valid({
        code: `@media (grid: calc(1)) {}
@media (GRID: max(0, 1)) {}`,
      }));

    it('still reports invalid integers', () =>
      ruleTester.invalid({
        code: '@media (grid: 2) {}',
        errors: [{ text: text('2', 'grid') }],
      }));
  });

  describe('unknown units', () => {
    it('leaves unknown units to S4653', () =>
      ruleTester.valid({
        code: `@media (width: 10pzx) {}
@media (10pzx < width) {}
@media (width: 2x) {}`,
      }));

    it('reports each unknown unit once when S4653 is enabled', async () => {
      expect(
        await reportedRules('@media (width: 10pzx) {}\n@media (width: 10deg) {}', [
          RULE,
          UNIT_RULE,
        ]),
      ).toEqual([UNIT_RULE, RULE]);
    });

    it('reports standard units that S4653 does not know', () =>
      ruleTester.invalid({
        code: `@media (width: 10db) {}
@media (width: 10st) {}
@media (width: 10Hz) {}`,
        errors: [
          { text: text('10db', 'width'), line: 1 },
          { text: text('10st', 'width'), line: 2 },
          { text: text('10Hz', 'width'), line: 3 },
        ],
      }));

    it('leaves obsolete units to S4653', () =>
      ruleTester.valid({
        code: `@media (color: 10vm) {}
@media (color: 10mozmm) {}`,
      }));
  });

  describe('known limitations', () => {
    it('does not report flexible lengths, which upstream accepts as lengths', () =>
      ruleTester.valid({ code: '@media (width: 1fr) {}' }));

    it('does not validate the result of math functions', () =>
      ruleTester.valid({
        code: `@media (width: calc(10s)) {}
@media (width: min(1px, 2s)) {}
@media (width: calc(red)) {}`,
      }));

    it('does not report values that upstream parses as invalid query syntax', () =>
      ruleTester.valid({
        code: `@media (width: 50%) {}
@media (hover: "hover") {}`,
      }));

    it('does not check media conditions outside @media', () =>
      ruleTester.valid({
        code: `@import url("print.css") (color: red);
@custom-media --narrow (hover: pointer);`,
      }));
  });

  describe('syntaxes', () => {
    for (const codeFilename of ['test.scss', 'test.less']) {
      it(`does not run on ${codeFilename} files`, () =>
        ruleTester.valid({ code: '@media (color: red) {}', codeFilename }));
    }

    it('reports CSS blocks in HTML files', () =>
      ruleTester.invalid({
        codeFilename: 'page.html',
        code: `<style>
@media (color: red) {}
</style>`,
        errors: [{ text: text('red', 'color'), line: 2 }],
      }));

    it('reports CSS blocks but not SCSS blocks in Vue files', async () => {
      const linter = new LinterWrapper();
      linter.initialize([{ key: RULE, configurations: [] }]);
      const { issues } = await linter.lint(
        vuePath,
        `<template><div /></template>
<style>
@media (color: red) {}
</style>
<style lang="scss">
@media (hover: pointer) {}
</style>`,
      );
      expect(issues.map(({ line }) => line)).toEqual([3]);
    });
  });

  describe('disable comments', () => {
    it('honors disable comments for the Sonar rule', () =>
      ruleTester.valid({
        code: `/* stylelint-disable-next-line ${RULE} */
@media (color: red) {}`,
      }));

    it('does not honor disable comments for the upstream rule', () =>
      ruleTester.invalid({
        code: `/* stylelint-disable-next-line ${UPSTREAM_RULE} */
@media (color: red) {}`,
        errors: [{ text: text('red', 'color'), line: 2 }],
      }));
  });

  it('preserves warnings from a separately configured upstream rule', async () => {
    expect(await reportedRules('@media (grid: calc(1)) {}', [RULE, UPSTREAM_RULE])).toEqual([
      UPSTREAM_RULE,
    ]);
  });
});
