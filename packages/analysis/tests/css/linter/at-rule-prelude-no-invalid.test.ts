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

const ruleTester = new StylelintRuleTester('at-rule-prelude-no-invalid');
const ruleTesterIgnoringFoo = new StylelintRuleTester('at-rule-prelude-no-invalid', [
  true,
  { ignoreAtRules: ['foo'] },
]);

describe('at-rule-prelude-no-invalid', () => {
  it('accepts valid at-rule preludes', () => ruleTester.valid({ code: '@property --foo {}' }));

  it('reports invalid at-rule preludes', () =>
    ruleTester.invalid({
      code: '@property foo {}',
      errors: [
        {
          text: 'Invalid prelude "foo" for at-rule "@property" (at-rule-prelude-no-invalid)',
          line: 1,
        },
      ],
    }));

  it('does not report in scss files', () =>
    ruleTester.valid({
      code: '@property foo {}',
      codeFilename: 'styles.scss',
    }));

  it('ignores configured at-rules', () =>
    ruleTesterIgnoringFoo.valid({ code: '@foo invalid-prelude {}' }));

  describe('Vue file embedded blocks', () => {
    const linter = new LinterWrapper();
    linter.initialize([{ key: 'at-rule-prelude-no-invalid', configurations: [] }]);
    const vueFile = normalizeToAbsolutePath('/tmp/component.vue');

    it('does not report on a scss style block', async () => {
      const { issues } = await linter.lint(vueFile, '<style lang="scss">@property foo {}</style>');
      expect(issues).toHaveLength(0);
    });

    it('reports on a plain CSS style block (no lang)', async () => {
      const { issues } = await linter.lint(vueFile, '<style>@property foo {}</style>');
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('at-rule-prelude-no-invalid');
    });

    it('reports on a lang="css" style block', async () => {
      const { issues } = await linter.lint(vueFile, '<style lang="css">@property foo {}</style>');
      expect(issues).toHaveLength(1);
      expect(issues[0].ruleId).toBe('at-rule-prelude-no-invalid');
    });
  });
});
