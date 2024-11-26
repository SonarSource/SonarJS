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

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run(`Template strings should be used instead of concatenation`, rule, {
  valid: [
    {
      code: `'hello' + 5;`,
    },
    {
      code: `5 + 'hello'`,
    },
    {
      code: `'hello' + 'world';`,
    },
  ],
  invalid: [
    {
      code: `5 + 'hello' + 10;`,
      errors: [
        {
          message: `Unexpected string concatenation.`,
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 17,
        },
      ],
      output: '`${5  }hello${  10}`;',
    },
    {
      code: `'hello' + 5 + 'world';`,
      output: '`hello${  5  }world`;',
      errors: 1,
    },
    {
      code: `'hello' + 'world' + 5;`,
      output: '`hello` + `world${  5}`;',
      errors: 1,
    },
    {
      code: `5 + 'hello' + 'world';`,
      output: '`${5  }hello` + `world`;',
      errors: 1,
    },
  ],
});
