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
ruleTester.run('Formatting SQL queries is security-sensitive', rule, {
  valid: [
    {
      code: `
      const mysql = require('mysql');
      conn.query(sql, [userInput], (err, res) => {});
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query(sql, (err, res) => {});
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query(sql);
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query();
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query("SELECT * FROM FOO");
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query("SELECT *" + " FROM FOO" + " WHERE BAR");
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query(foo("SELECT *" + userInput));
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      conn.query(\`SELECT * FROM FOO\`);
      `,
    },
    {
      code: `
      const mysql = require('mysql');
      sql = "select from " + userInput;
      conn.query(sql);
      `,
    },
    {
      code: `
      const pg = require('pg');
      conn.query(sql);
      `,
    },
    {
      code: `
      const mysql2 = require('mysql2');
      conn.query(sql);
      `,
    },
    {
      code: `
      const sequelize = require('sequelize');
      conn.query(sql);
      `,
    },
    {
      code: `
      import { query } from 'myDB';
      conn.query("select from " + userInput);
      `,
    },
    {
      // FN, userId is not escaped
      code: `
      const mysql = require('mysql');
      conn.query("SELECT * FROM users WHERE id = ' + userId", [userInput], (err, res) => {});
      `,
    },
    {
      code: `
      require('mysql');
      conn.query(x.foo());`,
    },
    {
      code: `
      require('mysql');
      conn.query(foo());`,
    },
    {
      code: `
      require('mysql');
      conn.query(concat());`,
    },
  ],
  invalid: [
    {
      code: `
      const mysql = require('mysql');
      conn.query('SELECT * FROM users WHERE id = ' + userId, (err, res) => {});`,
      errors: [
        {
          message: 'Make sure that executing SQL queries is safe here.',
          line: 3,
          endLine: 3,
          column: 7,
          endColumn: 17,
        },
      ],
    },
    {
      code: `
      import { query } from 'pg';
      conn.query('SELECT * FROM users WHERE id = ' + userId, (err, res => {}));
      `,
      errors: 1,
    },
    {
      code: `
      import { query } from 'mysql2';
      conn.query('SELECT * FROM users WHERE id = ' + userId, (err, res => {}));
      `,
      errors: 1,
    },
    {
      code: `
      import { query } from 'sequelize';
      conn.query('SELECT * FROM users WHERE id = ' + userId, (err, res => {}));
      `,
      errors: 1,
    },
    // FP, parameters are escaped
    {
      code: `
      const mysql = require('mysql');
      conn.query('SELECT * FROM users WHERE id = ' + connection.escape(userId), (err, res => {}));
      `,
      errors: 1,
    },

    {
      code: `
      require('mysql');
      conn.query('a' + 'b' + x);`,
      errors: 1,
    },
    {
      code: `
      require('mysql');
      conn.query('a' + x + 'b');`,
      errors: 1,
    },
    {
      code: `
      require('mysql');
      conn.query(x + 'a' + 'b');`,
      errors: 1,
    },

    {
      code: `
      require('mysql');
      conn.query(\`a \${x} b\`);`,
      errors: 1,
    },

    {
      code: `
      require('mysql');
      conn.query(x.concat());`,
      errors: 1,
    },

    {
      code: `
      require('mysql');
      conn.query(x.replace());`,
      errors: 1,
    },
  ],
});
