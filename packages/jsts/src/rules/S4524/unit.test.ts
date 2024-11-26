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
ruleTester.run('"default" clauses should be last', rule, {
  valid: [
    {
      code: `switch (true) {}`,
    },
    {
      code: `
        switch (z) {
          case "foo":
            console.log("Hello World")
            break;
          case "bar":
            console.log("42");
            break;
          default:
            console.log("Default message");
        }`,
    },
    {
      code: `
        switch (z) {
        case "foo":
            console.log("Hello World")
            break;
        }`,
    },
  ],
  invalid: [
    {
      code: `
        switch (x) {
          case 1:
            console.log("1");
          default:  //Nomcompliant
            console.log("0");
          case 2:
            console.log("2");
        }`,
      errors: [
        {
          message: 'Move this "default" clause to the end of this "switch" statement.',
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 18,
        },
      ],
    },

    {
      code: `
        switch (y) {
          default: //Nomcompliant
            console.log("Default message");
            break;
          case "foo":
            console.log("Hello World")
            break;
          case "bar":
            console.log("42");
            break;
        }`,
      errors: 1,
    },
  ],
});
