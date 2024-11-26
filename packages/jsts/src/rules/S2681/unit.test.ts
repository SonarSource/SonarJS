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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

ruleTester.run('Multiline blocks should be enclosed in curly braces', rule, {
  valid: [
    {
      code: `
      if (condition) {
        action1();
        action2();
      }
      `,
    },
    {
      code: `
      if (condition)
        action1();
      action2();
      `,
    },
    {
      code: `
      if (condition)
      action1();
      action2();
      `,
    },
    {
      code: `
        if (condition)
      action1();
      action2();
      `,
    },
    {
      code: `
      for(var i = 1; i < 3; i++) {
        action1();
        action2();
      }
      `,
    },
    {
      code: `
      while (condition) {
        action1();
        action2();
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      if (condition)
        action1();
        action2();
      `,
      errors: 1,
    },
    {
      code: `
      if (condition)
        action1();
        action2();
        action3();
      `,
      errors: [
        {
          message: `This line will not be executed conditionally; only the first line of this 3-line block will be. The rest will execute unconditionally.`,
          line: 4,
          endLine: 4,
          column: 9,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
      if (condition)
        action1();

        action2();
      `,
      errors: 1,
    },
    {
      code: `
      if (condition)
        action1();
        action2();
      
        action3();
      `,
      errors: 1,
    },
    {
      code: `if (condition) action1(); action2();`,
      errors: 1,
    },
    {
      code: `
      if (condition) action1();
        action2();
      `,
      errors: 1,
    },
    {
      code: `
      for(var i = 1; i < 3; i++)
        action1();
        action2();
      `,
      errors: [
        {
          message: `This line will not be executed in a loop; only the first line of this 2-line block will be. The rest will execute only once.`,
          line: 4,
          endLine: 4,
          column: 9,
          endColumn: 19,
        },
      ],
    },
    {
      code: `
      for(var x in obj)
        action1();
        action2();
      `,
      errors: 1,
    },
    {
      code: `
      for(var x of obj)
        action1();
        action2();
      `,
      errors: 1,
    },
    {
      code: `
      function foo() {
        if (condition) {
          action1();
          action2();
        }
      
        if (condition)
          action1();
          action2();
      }
      `,
      errors: 1,
    },
    {
      code: `
      while (condition)
        action1();
        action2();
      `,
      errors: 1,
    },
  ],
});

ruleTesterTs.run('TS: Multiline blocks should be enclosed in curly braces', rule, {
  valid: [
    {
      code: `
      namespace A {
        if (condition) {
          action1();
          action2();
        }
      }
      `,
    },
  ],
  invalid: [
    {
      code: `
      namespace A {
        if (condition)
          action1();
          action2();
      }
      `,
      errors: 1,
    },
    {
      code: `
      module B {
        if (condition)
          action1();
          action2();
      }
      `,
      errors: 1,
    },
  ],
});
