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
import { rule as annotations } from '../../../src/css/rules/S8757/rule.js';
import { meta as annotationMeta } from '../../../src/css/rules/S8757/meta.js';
import { rule as important } from '../../../src/css/rules/S9423/rule.js';
import { meta as importantMeta } from '../../../src/css/rules/S9423/meta.js';
import { rule as grid } from '../../../src/css/rules/S9442/rule.js';
import { meta as gridMeta } from '../../../src/css/rules/S9442/meta.js';
import { rule as media } from '../../../src/css/rules/S9452/rule.js';
import { meta as mediaMeta } from '../../../src/css/rules/S9452/meta.js';
import { rule as customProperties } from '../../../src/css/rules/S9450/rule.js';
import { meta as customPropertyMeta } from '../../../src/css/rules/S9450/meta.js';

const cases = [
  {
    plugin: annotations,
    upstream: annotationMeta.bindings[0].upstreamRule,
    code: 'a { color: red !typo; }',
    filtered: '$color: red !default;',
    codeFilename: 'test.scss',
    customSyntax: 'postcss-scss',
  },
  {
    plugin: important,
    upstream: importantMeta.bindings[0].upstreamRule,
    code: 'a { color: red !important; }',
    filtered: '@keyframes foo { from { color: red !important; } }',
    codeFilename: 'test.css',
  },
  {
    plugin: grid,
    upstream: gridMeta.bindings[0].upstreamRule,
    code: 'a { grid-template-areas: "a a" "a b"; }',
    filtered: 'a { grid-template-areas: "... a" "b ..."; }',
    codeFilename: 'test.css',
  },
  {
    plugin: media,
    upstream: mediaMeta.bindings[0].upstreamRule,
    code: '@media (orientation: sideways) {}',
    filtered: '@media (grid: calc(1)) {}',
    codeFilename: 'test.css',
  },
  {
    plugin: customProperties,
    upstream: customPropertyMeta.bindings[0].upstreamRule,
    code: 'a { --color: red; --color: blue; }',
    filtered: '@keyframes foo { from { --color: red !important; --color: blue; } }',
    codeFilename: 'test.css',
  },
];

for (const { plugin, upstream, code, filtered, codeFilename, customSyntax } of cases) {
  const sonarRule = plugin.ruleName;
  const lint = (
    settings: stylelint.ConfigRuleSettings<unknown, object> = true,
    config: stylelint.Config = {},
    source = code,
  ) =>
    stylelint.lint({
      code: source,
      codeFilename,
      config: { plugins: [plugin], customSyntax, rules: { [sonarRule]: settings }, ...config },
    });

  describe(`decorated reporting for ${sonarRule}`, () => {
    it('does not mark the file as errored when every warning is filtered', async () => {
      const result = await lint(true, {}, filtered);
      expect(result.results[0].warnings).toEqual([]);
      expect(result.errored).toBe(false);
    });

    it('uses the Sonar rule severity', async () => {
      const result = await lint([true, { severity: 'warning' }]);
      expect(result.results[0].warnings).toEqual([
        expect.objectContaining({ rule: sonarRule, severity: 'warning' }),
      ]);
      expect(result.errored).toBe(false);
    });

    it('honors quiet mode for the Sonar rule severity', async () => {
      const result = await lint([true, { severity: 'warning' }], { quiet: true });
      expect(result.results[0].warnings).toEqual([]);
      expect(result.errored).toBe(false);
    });

    it('keeps Sonar errors in quiet mode with a warning default', async () => {
      const result = await lint([true, { severity: 'error' }], {
        quiet: true,
        defaultSeverity: 'warning',
      });
      expect(result.results[0].warnings).toEqual([
        expect.objectContaining({ rule: sonarRule, severity: 'error' }),
      ]);
      expect(result.errored).toBe(true);
    });

    it('applies the Sonar custom message and URL after filtering', async () => {
      const settings = [true, { message: 'Custom message', url: 'https://example.com/rule' }];
      const result = await lint(settings);
      expect(result.results[0].warnings).toEqual([
        expect.objectContaining({
          rule: sonarRule,
          text: `Custom message (${sonarRule})`,
          url: 'https://example.com/rule',
        }),
      ]);
      const filteredResult = await lint(settings, {}, filtered);
      expect(filteredResult.results[0].warnings).toEqual([]);
      expect(filteredResult.errored).toBe(false);
    });

    it('records a used disable under the Sonar key', async () => {
      const result = await lint(
        true,
        { reportNeedlessDisables: true },
        `/* stylelint-disable-next-line ${sonarRule} */\n${code}`,
      );
      expect(result.results[0].warnings).toEqual([]);
      expect(result.errored).toBe(false);
    });

    it('reports a disable as needless when its upstream warning is filtered', async () => {
      const result = await lint(
        true,
        { reportNeedlessDisables: true },
        `/* stylelint-disable-next-line ${sonarRule} */\n${filtered}`,
      );
      expect(result.results[0].warnings).toEqual([
        expect.objectContaining({
          rule: '--report-needless-disables',
          text: `Needless disable for "${sonarRule}"`,
        }),
      ]);
    });

    it('supports ignoreDisables without losing disable bookkeeping', async () => {
      const result = await lint(
        true,
        { ignoreDisables: true, reportNeedlessDisables: true },
        `/* stylelint-disable-next-line ${sonarRule} */\n${code}`,
      );
      expect(result.results[0].warnings).toEqual([expect.objectContaining({ rule: sonarRule })]);
    });

    it('does not inherit the settings of a separately enabled upstream rule', async () => {
      const result = await lint(true, {
        rules: {
          [sonarRule]: [true, { severity: 'warning' }],
          [upstream]: [true, { message: 'Upstream message', url: 'https://example.com/upstream' }],
        },
      });
      expect(result.results[0].warnings).toHaveLength(2);
      expect(result.results[0].warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ rule: sonarRule, severity: 'warning', url: undefined }),
          expect.objectContaining({
            rule: upstream,
            severity: 'error',
            text: `Upstream message (${upstream})`,
            url: 'https://example.com/upstream',
          }),
        ]),
      );
      expect(result.errored).toBe(true);
    });

    it('preserves option diagnostics and their error status', async () => {
      const result = await lint([42]);
      expect(result.results[0].invalidOptionWarnings).toHaveLength(1);
      expect(result.results[0].warnings).toEqual([]);
      expect(result.errored).toBe(true);
    });
  });
}
