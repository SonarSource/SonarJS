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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2817', () => {
  it('S2817', () => {
    const ruleTesterJs = new DefaultParserRuleTester();
    const ruleTesterTs = new RuleTester();

    ruleTesterJs.run('No issues without types', rule, {
      valid: [
        {
          code: `
      var db2 = openDatabase("myDb", "1.0", "P", 2*1024*1024);
            `,
        },
        {
          code: `
      var db3 = this.openDatabase("myDb", "1.0", "P", 2*1024*1024, callback);
            `,
        },
        {
          code: `
      var win = window;
      win.openDatabase("db","1.0","stuff",2*1024*1024);
            `,
        },
      ],
      invalid: [],
    });

    ruleTesterTs.run('Web SQL databases should not be used', rule, {
      valid: [
        {
          code: `
      var deb = getDb();
      var db4 = db.openDatabase("myDb", "1.0", "P", 2*1024*1024);
            `,
        },
        {
          code: `
      function openDatabase() {
      }
      openDatabase();
            `,
        },
        {
          code: `
      var win = window;
      win.somethingElse(); // OK
            `,
        },
      ],
      invalid: [
        {
          code: `
      var win = window;
      win.openDatabase("db","1.0","stuff",2*1024*1024);
            `,
          errors: [
            {
              line: 3,
              column: 7,
              endLine: 3,
              endColumn: 23,
              message: 'Convert this use of a Web SQL database to another technology.',
            },
          ],
        },
        {
          code: `
      var db2 = openDatabase("myDb", "1.0", "P", 2*1024*1024);
            `,
          errors: 1,
        },
        {
          code: `
      var db3 = this.openDatabase("myDb", "1.0", "P", 2*1024*1024, callback);
            `,
          errors: 1,
        },
      ],
    });
  });
});
