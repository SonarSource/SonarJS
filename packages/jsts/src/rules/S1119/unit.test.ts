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

const ruleTester = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run('Labels should not be used', rule, {
  valid: [
    {
      code: `
      let x = doSomething();
      if (x <= 0) {
        doSomethingElse();
      }`,
    },
  ],
  invalid: [
    {
      code: `
      myLabel: {
        let x = doSomething();
        if (x > 0) {
          break myLabel;
        }
        doSomethingElse();
      }
`,
      errors: [
        {
          message: `Refactor the code to remove this label and the need for it.`,
          line: 2,
          endLine: 2,
          column: 7,
          endColumn: 14,
        },
      ],
    },
  ],
});
