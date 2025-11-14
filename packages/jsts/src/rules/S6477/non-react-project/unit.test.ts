/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from '../index.js';
import { join } from 'node:path';
import { NoTypeCheckingRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6477', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname); // change current working dir to avoid the package.json lookup to up in the tree

  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6477 turns into a noop on non-React projects', rule, {
    valid: [
      {
        code: `
      function Blog(props) {
        return (
          <ul>
            {props.posts.map((post) =>
              <li>
                {post.title}
              </li>
            )}
          </ul>
        );
      }
      `,
        filename: join(dirname, 'file.jsx'),
      },
    ],
    invalid: [],
  });
});
