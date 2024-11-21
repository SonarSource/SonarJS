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

const ruleTesterTs = new TypeScriptRuleTester();
const ruleTesterJs = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTesterTs.run('Array indexes should be numeric [TS]', rule, {
  valid: [
    {
      code: `
      const arr = [];
      arr[0] = 'a';`,
    },
    {
      code: `
      const car = {
        type : "Fiat",
        model : "500",
        color : "white"
      }; 
      car["type"] = "BMW"; // OK`,
    },
    {
      code: `
      let person = new Object();
      person["lastname"] = "Ben"`,
    },
  ],
  invalid: [
    {
      code: `
      const arr = [];
      arr['name'] = 'bob'`,
      errors: [
        {
          message: `Make it an object if it must have named properties; otherwise, use a numeric index here.`,
          line: 3,
          column: 7,
          endLine: 3,
          endColumn: 26,
        },
      ],
    },
    {
      code: `
      const arr = [];
      const strVar = 'foo';
      arr[strVar] = 42`,
      errors: 1,
    },
    {
      code: `
      const arr = new Array();
      arr["foo"] = 42`,
      errors: 1,
    },
    {
      code: `
      const fn = () => [1, 2, 3];
      fn()["foo"] = 42`,
      errors: 1,
    },
  ],
});

ruleTesterJs.run('Array indexes should be numeric [JS]', rule, {
  valid: [
    {
      code: `
      let arr = [];
      arr[0] = 'a';`,
    },
    {
      code: `
      let arr = [];
      arr['name'] = 'bob'`, // issue not raised because no types are available
    },
  ],
  invalid: [],
});
