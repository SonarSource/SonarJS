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

describe('S6947', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname); // change current working dir to avoid the package.json lookup to up in the tree
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run(
    'S6747 reports invalid JSX props even when React is not explicitly imported',
    rule,
    {
      valid: [
        {
          code: `import styled from 'styled-components';
<div css={{ color: "red" }}></div>;`,
          filename: join(dirname, 'filename.jsx'),
        },
        {
          code: `import { ThemeUIProvider } from 'theme-ui';
<div sx={{ color: "primary" }}></div>;`,
          filename: join(dirname, 'filename.jsx'),
        },
        {
          code: `import { jsx } from '@theme-ui/core';
<div sx={{ color: "primary" }}></div>;`,
          filename: join(dirname, 'filename.jsx'),
        },
      ],
      invalid: [
        {
          code: '<div class="foo"></div>;',
          filename: join(dirname, 'filename.jsx'),
          errors: 1,
        },
        {
          code: '<div css={{ color: "red" }}></div>;',
          filename: join(dirname, 'filename.jsx'),
          errors: 1,
        },
        {
          code: '<div sx={{ color: "primary" }}></div>;',
          filename: join(dirname, 'filename.jsx'),
          errors: 1,
        },
        {
          code: `import type { Theme } from 'theme-ui';
<div sx={{ color: "primary" }}></div>;`,
          filename: join(dirname, 'filename.tsx'),
          errors: 1,
        },
        {
          code: `import type styled from 'styled-components';
<div css={{ color: "red" }}></div>;`,
          filename: join(dirname, 'filename.tsx'),
          errors: 1,
        },
      ],
    },
  );
});
