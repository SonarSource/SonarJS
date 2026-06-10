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

const ruleTester = new StylelintRuleTester('declaration-property-value-keyword-no-deprecated');
const configuredRuleTester = new StylelintRuleTester(
  'declaration-property-value-keyword-no-deprecated',
  [true, { ignoreKeywords: ['overlay', 'blink'] }],
);

describe('declaration-property-value-keyword-no-deprecated', () => {
  it('accepts non-deprecated keyword values', async () => {
    await ruleTester.valid({
      code: 'b { overflow: auto; }',
    });
  });

  it('reports deprecated keyword values', async () => {
    await ruleTester.invalid({
      code: 'a { overflow: overlay; }',
      errors: [
        {
          text: 'Expected "overlay" to be "auto" (declaration-property-value-keyword-no-deprecated)',
          line: 1,
        },
      ],
    });
  });

  it('ignores configured deprecated keywords', async () => {
    await configuredRuleTester.valid({
      code: 'a { overflow: overlay; } c { text-decoration: blink; }',
    });
  });
});
