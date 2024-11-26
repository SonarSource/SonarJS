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
import { rule } from './index.js';
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

const tests = {
  valid: [
    {
      code: `new Promise();`,
    },
    {
      code: `var obj = new Object();`,
    },
    {
      code: `var System = 2`,
    },
  ],
  invalid: [
    {
      code: `var JSON = 5;`,
      errors: [
        {
          message: 'Remove this override of "JSON".',
          line: 1,
          endLine: 1,
          column: 5,
          endColumn: 9,
        },
      ],
    },
    {
      code: `Set = "str";`,
      errors: 1,
    },
    {
      code: `for (Math in arr) {};`,
      errors: 1,
    },
    {
      code: `function fun(Reflect) {};`,
      errors: 1,
    },
    {
      code: `JSON++;`,
      errors: 1,
    },
    {
      code: `function Date() {}`,
      errors: 1,
    },
  ],
};

const ruleTesterJs = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018 },
  env: { es6: true },
});
ruleTesterJs.run('Built-in objects should not be overridden [js]', rule, tests);

tests.valid.push({
  code: `
    enum Result {
      Error,
      Success
    }`,
});

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('Built-in objects should not be overridden [ts]', rule, tests);
