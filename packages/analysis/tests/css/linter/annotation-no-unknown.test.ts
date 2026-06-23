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

const ruleTester = new StylelintRuleTester('annotation-no-unknown');
const ruleTesterWithIgnore = new StylelintRuleTester('annotation-no-unknown', [
  true,
  { ignoreAnnotations: ['important'] },
]);

describe('annotation-no-unknown', () => {
  it('accepts known annotations', () =>
    ruleTester.valid({
      code: 'a { color: green !important; }',
    }));

  it('reports unknown annotations', () =>
    ruleTester.invalid({
      code: 'a { color: green !imprtant; }',
      errors: [{ text: 'Unknown annotation "!imprtant" (annotation-no-unknown)', line: 1 }],
    }));

  it('ignores annotations listed in ignoreAnnotations', () =>
    ruleTesterWithIgnore.valid({
      code: 'a { color: green !important; }',
    }));
});
