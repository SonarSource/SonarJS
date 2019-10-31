/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/cors";

ruleTester.run("Enabling Cross-Origin Resource Sharing is security-sensitive", rule, {
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
  ],
  invalid: [
    {
      code: `res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });`,
      errors: [
        {
          message: "Make sure that enabling CORS is safe here.",
          line: 1,
          endLine: 1,
          column: 22,
          endColumn: 51,
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
          message: "Make sure that enabling CORS is safe here.",
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
        res.header('Access-Control-Allow-Origin', 'http://localhost');
        //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        res.set('Access-Control-Max-Age', '86500');
        //      ^^^^^^^^^^^^^^^^^^^^^^^^
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        res.append('Access-Control-Allow-Credentials', 'true');
        //         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`,
      errors: 4,
    },
    {
      code: `
        const express = require('express');
        const cors = require('cors');
        app.use(cors());`,
      errors: 1,
    },
  ],
});
