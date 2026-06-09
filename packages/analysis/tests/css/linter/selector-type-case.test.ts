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

const ruleTester = new StylelintRuleTester('selector-type-case', ['lower']);

describe('selector-type-case', () => {
  it('accepts lowercase type selectors', async () => {
    await ruleTester.valid({
      code: 'a { color: red; }',
    });
  });

  it('reports uppercase type selectors', async () => {
    await ruleTester.invalid({
      code: 'A { color: red; }',
      errors: [{ text: 'Expected "A" to be "a" (selector-type-case)', line: 1 }],
    });
  });
});
