/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { rule } from 'rules/cors';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

const EXPECTED_MESSAGE = 'Make sure that enabling CORS is safe here.';

ruleTester.run('Enabling Cross-Origin Resource Sharing is security-sensitive', rule, {
  valid: [
    {
      code: `import * as express from 'foo'; app.use(cors());`,
    },
    {
      code: `import * as express from 'express'; app.use(bodyParser());`,
    },
    {
      code: `res.writeHead(200, { 'Content-Type': 'text/html' });`,
    },
    {
      code: `
      const srv2 = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'http://mytrustedorigin'); // FP
      });
      `,
    },
    {
      code: `
        const express = require('express');
        const cors = require('cors');
        res.header('Access-Control-Allow-Origin', 'http://localhost');
        res.set('Access-Control-Max-Age', '86500');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.append('Access-Control-Allow-Credentials', 'true');
        `,
    },
    {
      code: `
      const express = require('express');
      const cors = require('cors');
      app.use(cors({
        origin: 'http://localhost', // Compliant
        optionsSuccessStatus: 200
      }));
      `,
    },
  ],
  invalid: [
    {
      code: `res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });`,
      errors: [
        {
          message: EXPECTED_MESSAGE,
          line: 1,
          endLine: 1,
          column: 22,
          endColumn: 56,
        },
      ],
    },
    {
      code: `
        import * as express from 'express';
        import * as cors from 'cors';
        app.use(cors());`,
      errors: [
        {
          message: EXPECTED_MESSAGE,
          line: 4,
          endLine: 4,
          column: 17,
          endColumn: 23,
        },
      ],
    },
    {
      code: `
        const express = require('express');
        const cors = require('cors');
        app.use(cors());`,
      errors: 1,
    },
    {
      code: `
        res.setHeader('Access-Control-Allow-Origin', '*' ); // Sensitive
    `,
      errors: 1,
    },
    {
      code: `
        res.header('Access-Control-Allow-Origin', '*' ); // Sensitive
    `,
      errors: 1,
    },
    {
      code: `
        res.set('Access-Control-Allow-Origin', '*' ); // Sensitive
    `,
      errors: 1,
    },
    {
      code: `
        res.set({
          'Content-Type': 'text/plain',
          'Content-Length': '123',
          'Access-Control-Allow-Origin': '*'
        });
        const headers = {
          'Content-Type': 'text/plain',
          'Content-Length': '123',
          'Access-Control-Allow-Origin': '*'
        };
      `,
      errors: [
        {
          message: EXPECTED_MESSAGE,
          line: 5,
          endLine: 5,
          column: 11,
          endColumn: 45,
        },
        {
          message: EXPECTED_MESSAGE,
          line: 10,
          endLine: 10,
          column: 11,
          endColumn: 45,
        },
      ],
    },
    {
      code: `
      const express = require('express');
      const cors = require('cors');
      app.use(cors({
        origin: '*', // Sensitive
        optionsSuccessStatus: 200
      }));
      `,
      errors: [
        {
          message: EXPECTED_MESSAGE,
          line: 4,
          endLine: 7,
          column: 15,
          endColumn: 9,
        },
      ],
    },
    {
      code: `
      const express = require('express');
      const cors = require('cors');
      let corsOptions = {
        origin: '*', // Sensitive
        optionsSuccessStatus: 200
      };
      app.use(cors(corsOptions));
      `,
      errors: [
        {
          message: JSON.stringify({
            message: EXPECTED_MESSAGE,
            secondaryLocations: [{ column: 19, line: 8, endColumn: 30, endLine: 8 }],
          }),
          line: 5,
          endLine: 5,
          column: 9,
          endColumn: 20,
        },
      ],
    },
  ],
});
