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

const ruleTester = new StylelintRuleTester('nesting-selector-no-missing-scoping-root');
const configuredRuleTester = new StylelintRuleTester('nesting-selector-no-missing-scoping-root', [
  true,
  { ignoreAtRules: ['media'] },
]);

describe('nesting-selector-no-missing-scoping-root', () => {
  it('accepts nesting selectors with a scoping root', async () => {
    await ruleTester.valid({
      code: '.button { & { color: red; } }',
    });
  });

  it('reports nesting selectors that miss a scoping root', async () => {
    await ruleTester.invalid({
      code: '& { color: red; }',
      errors: [
        {
          text: 'Missing scoping root (nesting-selector-no-missing-scoping-root)',
          line: 1,
        },
      ],
    });
  });

  it('ignores nesting selectors inside configured at-rules', async () => {
    await configuredRuleTester.valid({
      code: '@media print { & { color: red; } }',
    });
  });
});
