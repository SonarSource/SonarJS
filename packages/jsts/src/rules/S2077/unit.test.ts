/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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

describe('S2077', () => {
  it('S2077', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Formatting SQL queries is security-sensitive', rule, {
      valid: [
        // Safe: parameterized queries
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(sql, [userInput], (err, res) => {});
      `,
        },
        // Safe: simple identifier (can't track)
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(sql, (err, res) => {});
      `,
        },
        // Safe: simple identifier
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(sql);
      `,
        },
        // Safe: no arguments
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query();
      `,
        },
        // Safe: hardcoded string literal
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query("SELECT * FROM FOO");
      `,
        },
        // Safe: concatenation of hardcoded literals only
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query("SELECT *" + " FROM FOO" + " WHERE BAR");
      `,
        },
        // Safe: function call wrapping the concatenation
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(foo("SELECT *" + userInput));
      `,
        },
        // Safe: template literal without expressions
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(\`SELECT * FROM FOO\`);
      `,
        },
        // Safe: identifier (can't track variable assignment)
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      sql = "select from " + userInput;
      conn.query(sql);
      `,
        },
        // pg module
        {
          code: `
      const pg = require('pg');
      const client = new pg.Client();
      client.query(sql);
      `,
        },
        // mysql2 module
        {
          code: `
      const mysql2 = require('mysql2');
      const conn = mysql2.createConnection();
      conn.query(sql);
      `,
        },
        // sequelize module
        {
          code: `
      const { Sequelize } = require('sequelize');
      const sequelize = new Sequelize();
      sequelize.query(sql);
      `,
        },
        // Safe: different module, not a DB module
        {
          code: `
      import { query } from 'myDB';
      conn.query("select from " + userInput);
      `,
        },
        // Safe: function call result
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(x.foo());`,
        },
        // Safe: function call result
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(foo());`,
        },
        // Safe: function call result
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(concat());`,
        },
      ],
      invalid: [
        // mysql: concatenation with variable
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query('SELECT * FROM users WHERE id = ' + userId, (err, res) => {});`,
          errors: [
            {
              message: 'Make sure that executing SQL queries is safe here.',
              line: 4,
              endLine: 4,
              column: 7,
              endColumn: 17,
            },
          ],
        },
        // pg: concatenation with variable
        {
          code: `
      import pg from 'pg';
      const client = new pg.Client();
      client.query('SELECT * FROM users WHERE id = ' + userId, (err, res => {}));
      `,
          errors: 1,
        },
        // pg: Pool
        {
          code: `
      import pg from 'pg';
      const pool = new pg.Pool();
      pool.query('SELECT * FROM users WHERE id = ' + userId);
      `,
          errors: 1,
        },
        // mysql2: concatenation with variable
        {
          code: `
      import mysql2 from 'mysql2';
      const conn = mysql2.createConnection();
      conn.query('SELECT * FROM users WHERE id = ' + userId, (err, res => {}));
      `,
          errors: 1,
        },
        // sequelize: concatenation with variable
        {
          code: `
      import { Sequelize } from 'sequelize';
      const sequelize = new Sequelize();
      sequelize.query('SELECT * FROM users WHERE id = ' + userId, (err, res => {}));
      `,
          errors: 1,
        },
        // mysql: concatenation at the end
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query('a' + 'b' + x);`,
          errors: 1,
        },
        // mysql: concatenation in the middle
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query('a' + x + 'b');`,
          errors: 1,
        },
        // mysql: concatenation at the start
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(x + 'a' + 'b');`,
          errors: 1,
        },
        // mysql: template literal with expression
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(\`a \${x} b\`);`,
          errors: 1,
        },
        // mysql: .concat() call
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(x.concat());`,
          errors: 1,
        },
        // mysql: .replace() call
        {
          code: `
      const mysql = require('mysql');
      const conn = mysql.createConnection();
      conn.query(x.replace());`,
          errors: 1,
        },
      ],
    });
  });
});
