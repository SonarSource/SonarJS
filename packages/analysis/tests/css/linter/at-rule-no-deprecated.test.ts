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

const ruleTester = new StylelintRuleTester('at-rule-no-deprecated');
const ruleTesterWithIgnore = new StylelintRuleTester('at-rule-no-deprecated', [
  true,
  { ignoreAtRules: ['viewport'] },
]);

describe('at-rule-no-deprecated', () => {
  it('accepts current at-rules', async () => {
    await ruleTester.valid({
      code: '@starting-style {} a { @layer {} }',
    });
  });

  it('reports deprecated @viewport', async () => {
    await ruleTester.invalid({
      code: '@viewport { width: device-width; }',
      errors: [{ text: 'Deprecated at-rule "@viewport" (at-rule-no-deprecated)', line: 1 }],
    });
  });

  it('reports deprecated @document', async () => {
    await ruleTester.invalid({
      code: '@document url("https://example.com") { .hero { color: red; } }',
      errors: [{ text: 'Deprecated at-rule "@document" (at-rule-no-deprecated)', line: 1 }],
    });
  });

  it('reports deprecated @nest', async () => {
    await ruleTester.invalid({
      code: '.foo { @nest .bar & { color: red; } }',
      errors: [{ text: 'Deprecated at-rule "@nest" (at-rule-no-deprecated)', line: 1 }],
    });
  });

  it('ignores at-rules listed in ignoreAtRules', async () => {
    await ruleTesterWithIgnore.valid({
      code: '@viewport { width: device-width; }',
    });
  });
});
