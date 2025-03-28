/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4507', () => {
  it('S4507', () => {
    const ruleTester = new DefaultParserRuleTester();

    const message =
      'Make sure this debug feature is deactivated before delivering the code in production.';

    ruleTester.run(
      'Delivering code in production with debug features activated is security-sensitive',
      rule,
      {
        valid: [
          {
            code: `
      Debug.write("hello, world");

      // we report only on trivial (and mostly used) usages without object access
      this.alert("here!");
      window.alert("here!");

      // custom is ok
      function alert() {}
      alert("here!");

      import { confirm } from './confirm';
      confirm("Are you sure?");
      `,
          },
          {
            code: `
      alert("here!");
      confirm("Are you sure?");
      prompt("What's your name?", "John Doe");
      `,
          },
          {
            code: `debugger;`,
          },
        ],
        invalid: [
          {
            code: `
        const errorhandler = require('errorhandler');
        if (process.env.NODE_ENV === 'development') {
          app1.use(errorhandler()); // Compliant
        }
        app2.use(errorhandler()); // Noncompliant  
        `,
            errors: [
              {
                message,
                line: 6,
                column: 18,
                endColumn: 32,
              },
            ],
          },
          {
            code: `
        import errorhandler from 'errorhandler';
        const handler = errorhandler();
        app1.use(handler); // Noncompliant  
        if (process.env.NODE_ENV === 'development') {
          app2.use(handler); // Compliant
        } else {
          app3.use(handler); // Compliant
        }
        app4.use();
        `,
            errors: [
              {
                message,
                line: 3,
                column: 25,
                endColumn: 39,
              },
            ],
          },
          {
            code: `
        const errorhandler = require('errorhandler');
        const middlewares = [
          helmet(),
          errorhandler()
        ];
        app2.use(sth, middlewares, sthElse); // Noncompliant  
        `,
            errors: [
              {
                message,
                line: 5,
                column: 11,
                endColumn: 25,
              },
            ],
          },
        ],
      },
    );
  });
});
