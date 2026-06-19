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

const ruleTester = new StylelintRuleTester('no-invalid-position-at-import-rule');
const configuredRuleTester = new StylelintRuleTester('no-invalid-position-at-import-rule', [
  true,
  { ignoreAtRules: ['tailwind'] },
]);

describe('no-invalid-position-at-import-rule', () => {
  it('accepts @import at the start of a file', async () => {
    await ruleTester.valid({
      code: "@import 'foo.css';\na { color: red; }",
    });
  });

  it('reports @import after other rules', async () => {
    await ruleTester.invalid({
      code: "a { color: red; }\n@import 'foo.css';",
      errors: [
        {
          text: 'Invalid position for @import rule (no-invalid-position-at-import-rule)',
          line: 2,
        },
      ],
    });
  });

  it('ignores configured at-rules before @import', async () => {
    await configuredRuleTester.valid({
      code: "@tailwind utilities;\n@import 'foo.css';",
    });
  });
});
