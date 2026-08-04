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
  process.chdir(dirname); // change current working dir to avoid the package.json lookup going up the tree
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6747 ignores css prop for legacy Emotion core projects', rule, {
    valid: [
      {
        // Emotion core uses the css prop with its JSX pragma/runtime.
        code: `<div css={{ color: 'red' }}>Hello</div>;`,
        filename: join(dirname, 'filename.jsx'),
      },
    ],
    invalid: [
      {
        // Other unknown props are still flagged in Emotion core projects.
        code: `<div invalidProp={{ color: 'red' }}>Hello</div>;`,
        filename: join(dirname, 'filename.jsx'),
        errors: 1,
      },
    ],
  });
});
