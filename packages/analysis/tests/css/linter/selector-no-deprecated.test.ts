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

const ruleTester = new StylelintRuleTester('selector-no-deprecated');
const configuredRuleTester = new StylelintRuleTester('selector-no-deprecated', [
  true,
  { ignoreSelectors: ['acronym', '/^focus-/'] },
]);

describe('selector-no-deprecated', () => {
  it('accepts supported selectors', async () => {
    await ruleTester.valid({
      code: `
abbr {}
a:focus-visible {}
`,
    });
  });

  it('reports deprecated type selectors', async () => {
    await ruleTester.invalid({
      code: `
acronym {}
`,
      errors: [{ text: 'Deprecated selector "acronym" (selector-no-deprecated)', line: 2 }],
    });
  });

  it('reports deprecated pseudo-class selectors with replacements', async () => {
    await ruleTester.invalid({
      code: `
a:focus-ring {}
`,
      errors: [
        {
          text: 'Expected ":focus-ring" to be ":focus-visible" (selector-no-deprecated)',
          line: 2,
        },
      ],
    });
  });

  it('ignores configured selector names and regexes', async () => {
    await configuredRuleTester.valid({
      code: `
acronym {}
a:focus-ring {}
`,
    });
  });
});
