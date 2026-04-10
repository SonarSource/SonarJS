/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
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
        // sqlite3 module: safe identifier
        {
          code: `
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(':memory:');
      db.run(sql);
      `,
        },
        // better-sqlite3 module: safe identifier
        {
          code: `
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.exec(sql);
      `,
        },
        // mssql module: safe identifier
        {
          code: `
      const mssql = require('mssql');
      const pool = new mssql.ConnectionPool(config);
      pool.query(sql);
      `,
        },
        // mssql Request: safe identifier
        {
          code: `
      const mssql = require('mssql');
      const request = new mssql.Request();
      request.query(sql);
      `,
        },
        // oracledb module: safe identifier
        {
          code: `
      const oracledb = require('oracledb');
      const conn = oracledb.getConnection();
      conn.execute(sql);
      `,
        },
        // knex module: safe identifier
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.raw(sql);
      `,
        },
        // pg-promise module: safe identifier
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.query(sql);
      `,
        },
        // typeorm module: safe identifier
        {
          code: `
      const typeorm = require('typeorm');
      const conn = typeorm.createConnection();
      conn.query(sql);
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
        // sqlite3: Database.run with concatenation
        {
          code: `
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(':memory:');
      db.run('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // sqlite3: Database.all with template literal
        {
          code: `
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(':memory:');
      db.all(\`SELECT * FROM users WHERE id = \${userId}\`);`,
          errors: 1,
        },
        // sqlite3: Database.get with concatenation
        {
          code: `
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(':memory:');
      db.get('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // sqlite3: Database.each with concatenation
        {
          code: `
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(':memory:');
      db.each('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // sqlite3: Database.exec with concatenation
        {
          code: `
      const sqlite3 = require('sqlite3');
      const db = new sqlite3.Database(':memory:');
      db.exec('DROP TABLE ' + tableName);`,
          errors: 1,
        },
        // better-sqlite3: exec with concatenation
        {
          code: `
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.exec('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // better-sqlite3: prepare with template literal
        {
          code: `
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.prepare(\`SELECT * FROM users WHERE id = \${userId}\`);`,
          errors: 1,
        },
        // mssql: ConnectionPool.query with concatenation
        {
          code: `
      const mssql = require('mssql');
      const pool = new mssql.ConnectionPool(config);
      pool.query('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // mssql: Request.query with template literal
        {
          code: `
      const mssql = require('mssql');
      const request = new mssql.Request();
      request.query(\`SELECT * FROM users WHERE id = \${userId}\`);`,
          errors: 1,
        },
        // mssql: Request.batch with concatenation
        {
          code: `
      const mssql = require('mssql');
      const request = new mssql.Request();
      request.batch('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // mssql: Request.execute with concatenation
        {
          code: `
      const mssql = require('mssql');
      const request = new mssql.Request();
      request.execute('sp_' + procName);`,
          errors: 1,
        },
        // mysql2: createConnection.execute with concatenation
        {
          code: `
      const mysql2 = require('mysql2');
      const conn = mysql2.createConnection();
      conn.execute('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // oracledb: getConnection.execute with concatenation
        {
          code: `
      const oracledb = require('oracledb');
      const conn = oracledb.getConnection();
      conn.execute('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // oracledb: getConnection.executeMany with template literal
        {
          code: `
      const oracledb = require('oracledb');
      const conn = oracledb.getConnection();
      conn.executeMany(\`INSERT INTO users VALUES (\${userId})\`);`,
          errors: 1,
        },
        // oracledb: getConnection.queryStream with concatenation
        {
          code: `
      const oracledb = require('oracledb');
      const conn = oracledb.getConnection();
      conn.queryStream('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: query with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.query('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: any with template literal
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.any(\`SELECT * FROM users WHERE id = \${userId}\`);`,
          errors: 1,
        },
        // pg-promise: one with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.one('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: none with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.none('DELETE FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: oneOrNone with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.oneOrNone('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: many with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.many('SELECT * FROM users WHERE name = ' + name);`,
          errors: 1,
        },
        // pg-promise: manyOrNone with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.manyOrNone('SELECT * FROM users WHERE name = ' + name);`,
          errors: 1,
        },
        // pg-promise: each with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.each('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: map with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.map('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: result with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.result('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // pg-promise: multi with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.multi('SELECT 1; SELECT ' + userId);`,
          errors: 1,
        },
        // pg-promise: multiResult with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.multiResult('SELECT 1; SELECT ' + userId);`,
          errors: 1,
        },
        // pg-promise: func with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.func('my_func_' + name);`,
          errors: 1,
        },
        // pg-promise: proc with concatenation
        {
          code: `
      const pgp = require('pg-promise');
      const db = pgp()(config);
      db.proc('my_proc_' + name);`,
          errors: 1,
        },
        // knex: raw with concatenation
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.raw('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // knex: raw with template literal
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.raw(\`SELECT * FROM users WHERE id = \${userId}\`);`,
          errors: 1,
        },
        // knex: whereRaw with concatenation
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.whereRaw('id = ' + userId);`,
          errors: 1,
        },
        // knex: havingRaw with concatenation
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.havingRaw('count > ' + minCount);`,
          errors: 1,
        },
        // knex: groupByRaw with concatenation
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.groupByRaw('category_' + col);`,
          errors: 1,
        },
        // knex: orderByRaw with concatenation
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.orderByRaw(col + ' DESC');`,
          errors: 1,
        },
        // knex: joinRaw with concatenation
        {
          code: `
      const knex = require('knex');
      const db = knex(config);
      db.joinRaw('NATURAL JOIN ' + tableName);`,
          errors: 1,
        },
        // typeorm: createConnection.query with concatenation
        {
          code: `
      const typeorm = require('typeorm');
      const conn = typeorm.createConnection();
      conn.query('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // typeorm: getConnection.query with template literal
        {
          code: `
      const typeorm = require('typeorm');
      const conn = typeorm.getConnection();
      conn.query(\`SELECT * FROM users WHERE id = \${userId}\`);`,
          errors: 1,
        },
        // typeorm: getManager.query with concatenation
        {
          code: `
      const typeorm = require('typeorm');
      const manager = typeorm.getManager();
      manager.query('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
        // typeorm: getRepository.query with concatenation
        {
          code: `
      const typeorm = require('typeorm');
      const repo = typeorm.getRepository();
      repo.query('SELECT * FROM users WHERE id = ' + userId);`,
          errors: 1,
        },
      ],
    });
  });

  it('S2077 with type information', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Formatting SQL queries is security-sensitive [TS]', rule, {
      valid: [
        // No infinite loop when local variable shadows imported name
        {
          code: `import { geolocation as geo } from "@vercel/functions";
      const geo = geo(request);`,
        },
      ],
      invalid: [
        // mysql: ESM namespace import with concatenation
        {
          code: `import * as mysql from 'mysql';
      const mycon = mysql.createConnection({ host, user, password, database });
      mycon.connect(function(error) {
        mycon.query('SELECT * FROM users WHERE id = ' + userinput, (err, res) => {}); // Noncompliant
      });`,
          errors: [
            {
              message: 'Make sure that executing SQL queries is safe here.',
              line: 4,
            },
          ],
        },
      ],
    });
  });
});
