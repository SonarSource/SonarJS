/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { RuleTester } from 'eslint';
import { rule } from 'linting/eslint/rules/production-debug';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

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
        import * as errorhandler from 'errorhandler';
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
