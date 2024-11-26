/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});
ruleTester.run(
  'The return value of "useState" should be destructured and named symmetrically',
  rule,
  {
    valid: [
      {
        code: `
      import { useState } from 'react';
      function useFoo() {
        const [foo] = useState();
        return [foo];
      }`,
      },
    ],
    invalid: [
      {
        code: `
      import { useState } from 'react';
      function useFoo() {
        const [foo, bar] = useState();
        return [foo, bar];
      }`,
        errors: 1,
      },
    ],
  },
);
