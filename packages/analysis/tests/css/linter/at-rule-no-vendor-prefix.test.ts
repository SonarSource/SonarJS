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
import { StylelintRuleTester } from '../tools/tester/tester.js';

const ruleTester = new StylelintRuleTester('at-rule-no-vendor-prefix');
const configuredRuleTester = new StylelintRuleTester('at-rule-no-vendor-prefix', [
  true,
  { ignoreAtRules: ['-webkit-keyframes'] },
]);

describe('at-rule-no-vendor-prefix', () => {
  it('accepts standard at-rules', async () => {
    await ruleTester.valid({
      code: '@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }',
    });
  });

  it('reports vendor-prefixed at-rules', async () => {
    await ruleTester.invalid({
      code: '@-webkit-keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }',
      errors: [
        {
          text: 'Vendor-prefixed at-rule "@-webkit-keyframes" (at-rule-no-vendor-prefix)',
          line: 1,
        },
      ],
    });
  });

  it('ignores configured vendor-prefixed at-rules', async () => {
    await configuredRuleTester.valid({
      code: '@-webkit-keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }',
    });
  });
});
