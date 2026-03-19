/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
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
import { join } from 'node:path';
import { NoTypeCheckingRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6477', () => {
  const dirname = join(import.meta.dirname, 'fixtures');

  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6477 reports missing keys in JSX list items', rule, {
    valid: [],
    invalid: [
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
        errors: 1,
      },
    ],
  });
});
