import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/sql-queries";

ruleTester.run("Executing SQL queries is security-sensitive", rule, {
  valid: [
    {
      code: `
      const mysql = require('mysql');
      conn.query(sql, [userInput], (err, res) => {});
      `,
    },
    {
      code: `
      const pg = require('pg');
      conn.query(sql, [userInput], (err, res) => {});
      `,
    },
    {
      code: `
      const pg = require('pg');
      conn.query("SELECT * FROM FOO", (err, res) => {});
      `,
    },
    {
      code: `
      import { query } from 'myDB';
      query("SELECT * FROM users WHERE id = ' + userId", (err, res) => {});
      `,
    },
    {
      code: `
      const pg = require('pg');
      pg.query();
      `,
    },
    // FN, userId is not escaped
    {
      code: `
      const mysql = require('mysql');
      conn.query("SELECT * FROM users WHERE id = ' + userId", [userInput], (err, res) => {});
      `,
    },
  ],
  invalid: [
    {
      code: `
      const mysql = require('mysql');
      conn.query(sql, (err, res) => {});`,
      errors: [
        {
          message: "Make sure that executing SQL queries is safe here.",
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
    // FP, parameters are escaped
    {
      code: `
      const mysql = require('mysql');
      conn.query('SELECT * FROM users WHERE id = ' + connection.escape(userId), (err, res => {}));
      `,
      errors: 1,
    },
  ],
});
