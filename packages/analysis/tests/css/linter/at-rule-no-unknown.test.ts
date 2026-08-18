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
import { LinterWrapper } from '../../../src/css/linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';
import { StylelintRuleTester } from '../tools/tester/tester.js';

const ruleTester = new StylelintRuleTester('at-rule-no-unknown');
const configuredRuleTester = new StylelintRuleTester('at-rule-no-unknown', [
  true,
  { ignoreAtRules: ['custom', '/^project-/'] },
]);
const supportedToolDirectives = [
  'value',
  'tailwind',
  'screen',
  'responsive',
  'variants',
  'apply',
  'theme',
  'source',
  'utility',
  'variant',
  'custom-variant',
  'reference',
  'config',
  'plugin',
];
const supportedToolRuleTester = new StylelintRuleTester('at-rule-no-unknown', [
  true,
  { ignoreAtRules: supportedToolDirectives },
]);

describe('at-rule-no-unknown', () => {
  it('accepts standard CSS at-rules', () =>
    ruleTester.valid({ code: '@media (width > 0) { a { color: red; } }' }));

  for (const directive of ['layer', 'container']) {
    it(`accepts the standard @${directive} at-rule without an explicit exclusion`, () =>
      ruleTester.valid({ code: `@${directive} example {}` }));
  }

  for (const directive of supportedToolDirectives) {
    it(`accepts the supported @${directive} tool directive`, () =>
      supportedToolRuleTester.valid({ code: `@${directive} value;` }));
  }

  it('reports unknown CSS at-rules', () =>
    ruleTester.invalid({
      code: '@encoding "utf-8";',
      errors: [
        {
          text: 'Unknown at-rule "@encoding" (at-rule-no-unknown)',
          line: 1,
        },
      ],
    }));

  it('accepts configured names and regular expressions', async () => {
    await configuredRuleTester.valid({ code: '@custom {}' });
    await configuredRuleTester.valid({ code: '@project-extension {}' });
  });

  for (const codeFilename of ['styles.scss', 'styles.sass', 'styles.less']) {
    it(`does not run on ${codeFilename}`, () =>
      ruleTester.valid({
        code: '@unknown value',
        codeFilename,
      }));
  }

  describe('Vue file embedded blocks', () => {
    const linter = new LinterWrapper();
    linter.initialize([{ key: 'at-rule-no-unknown', configurations: [] }]);
    const vueFile = normalizeToAbsolutePath('/tmp/component.vue');

    it('reports on a plain CSS style block', async () => {
      const { issues } = await linter.lint(vueFile, '<style>@unknown {}</style>');
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('at-rule-no-unknown');
    });

    it('reports on a lang="css" style block', async () => {
      const { issues } = await linter.lint(vueFile, '<style lang="css">@unknown {}</style>');
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('at-rule-no-unknown');
    });

    for (const lang of ['scss', 'sass', 'less']) {
      it(`does not report on a ${lang} style block`, async () => {
        const { issues } = await linter.lint(
          vueFile,
          `<style lang="${lang}">@unknown value</style>`,
        );
        expect(issues).toHaveLength(0);
      });
    }
  });
});
