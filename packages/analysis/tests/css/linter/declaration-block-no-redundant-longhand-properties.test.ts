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

const ruleTester = new StylelintRuleTester('declaration-block-no-redundant-longhand-properties');
const ignoreShorthandsRuleTester = new StylelintRuleTester(
  'declaration-block-no-redundant-longhand-properties',
  [true, { ignoreShorthands: ['transition'] }],
);
const ignoreLonghandsRuleTester = new StylelintRuleTester(
  'declaration-block-no-redundant-longhand-properties',
  [true, { ignoreLonghands: ['transition-property'] }],
);

describe('declaration-block-no-redundant-longhand-properties', () => {
  it('accepts non-redundant longhand properties', async () => {
    await ruleTester.valid({
      code: 'a { transition-property: color; transition-duration: 0.5s; }',
    });
  });

  it('reports redundant longhand properties that can be shortened', async () => {
    await ruleTester.invalid({
      code: 'a { transition-property: color; transition-duration: 0.5s; transition-timing-function: ease; transition-delay: 0s; }',
      errors: [
        {
          text: 'Expected "transition-property, transition-duration, transition-timing-function, transition-delay" to be "transition" (declaration-block-no-redundant-longhand-properties)',
          line: 1,
        },
      ],
    });
  });

  it('ignores longhands for configured shorthands', async () => {
    await ignoreShorthandsRuleTester.valid({
      code: 'a { transition-property: color; transition-duration: 0.5s; transition-timing-function: ease; transition-delay: 0s; }',
    });
  });

  it('ignores configured longhand property names', async () => {
    await ignoreLonghandsRuleTester.valid({
      code: 'a { transition-property: color; transition-duration: 0.5s; transition-timing-function: ease; transition-delay: 0s; }',
    });
  });
});
