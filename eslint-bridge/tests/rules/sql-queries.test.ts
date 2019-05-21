import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/sql-queries";

ruleTester.run("Formatting SQL queries is security-sensitive", rule, {
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
