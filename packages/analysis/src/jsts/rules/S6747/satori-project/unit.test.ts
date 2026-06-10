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
  ruleTester.run('S6747 ignores tw prop when satori is imported', rule, {
    valid: [
      {
        // satori uses tw prop for Tailwind CSS class names mapped to inline styles
        code: `import satori from 'satori';
<div tw="flex flex-col w-full h-full p-16 bg-white">Hello</div>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        code: `import satori from 'satori';
<span tw="ml-4 text-2xl font-semibold text-indigo-700">My Site</span>;`,
        filename: join(dirname, 'filename.jsx'),
      },
    ],
    invalid: [
      {
        // tw is still flagged in satori projects when the current file does not import its API
        code: `<div tw="flex items-center">Hello</div>;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
      {
        // Other unknown props are still flagged in satori projects
        code: `import satori from 'satori';
<div class="foo">Hello</div>;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
    ],
  });
});
