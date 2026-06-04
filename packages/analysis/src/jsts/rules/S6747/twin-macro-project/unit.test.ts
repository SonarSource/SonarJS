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
import { rule } from '../rule.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6747', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6747 ignores tw prop for twin.macro projects', rule, {
    valid: [
      {
        // twin.macro processes the tw prop at build time to generate CSS-in-JS styles
        code: `<button tw="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg">Click</button>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `<div tw="flex flex-col shadow-lg rounded-xl p-8 bg-white"><h2 tw="text-2xl font-bold">Title</h2></div>;`,
        filename: join(dirname, 'filename.jsx'),
      },
    ],
    invalid: [
      {
        // Other unknown props are still flagged in twin.macro projects
        code: `<div class="foo">Hello</div>;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
    ],
  });
});
