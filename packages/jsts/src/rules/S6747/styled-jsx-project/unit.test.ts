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
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6747', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6747 ignores jsx and global props for Styled-JSX projects', rule, {
    valid: [
      {
        // styled-jsx scoped styles
        code: `<style jsx>{".foo { color: red; }"}</style>;`,
        filename: join(dirname, 'filename.jsx'),
      },
      {
        // styled-jsx global styles
        code: `<style jsx global>{".foo { color: red; }"}</style>;`,
        filename: join(dirname, 'filename.jsx'),
      },
    ],
    invalid: [],
  });
});
