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

const ruleTester = new StylelintRuleTester('block-no-redundant-nested-style-rules');

describe('block-no-redundant-nested-style-rules', () => {
  it('reports redundant nested style rules', async () => {
    await ruleTester.invalid({
      code: ['a {', '  & {', '    color: red;', '  }', '}'].join('\n'),
      errors: [
        {
          text: 'Redundant nested style rule (block-no-redundant-nested-style-rules)',
          line: 2,
        },
      ],
    });
  });

  it('accepts meaningful nested style rules', async () => {
    await ruleTester.valid({
      code: [
        'a {',
        '  color: red;',
        '}',
        '',
        'a {',
        '  &.active {',
        '    color: red;',
        '  }',
        '}',
      ].join('\n'),
    });
  });
});
