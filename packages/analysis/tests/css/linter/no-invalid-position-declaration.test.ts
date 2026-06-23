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

const ruleTester = new StylelintRuleTester('no-invalid-position-declaration');
const configuredRuleTester = new StylelintRuleTester('no-invalid-position-declaration', [
  true,
  { ignoreAtRules: ['include'] },
]);

describe('no-invalid-position-declaration', () => {
  it('accepts declarations inside a style rule', async () => {
    await ruleTester.valid({
      code: 'a { color: red; }',
    });
  });

  it('reports a top-level declaration', async () => {
    await ruleTester.invalid({
      code: 'color: red;',
      errors: [
        {
          text: 'Invalid position for declaration (no-invalid-position-declaration)',
          line: 1,
        },
      ],
    });
  });

  it('reports a declaration directly inside an at-rule', async () => {
    await ruleTester.invalid({
      code: '@media all { color: red; }',
      errors: [
        {
          text: 'Invalid position for declaration (no-invalid-position-declaration)',
          line: 1,
        },
      ],
    });
  });

  it('ignores declarations inside configured at-rules', async () => {
    await configuredRuleTester.valid({
      code: '@include foo { color: red; }',
    });
  });
});
