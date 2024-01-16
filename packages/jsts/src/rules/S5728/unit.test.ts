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
import { rule } from './';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Disabling content security policy fetch directives is security-sensitive', rule, {
  valid: [
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();`,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet()
        );`,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        const h = helmet();
        app.use(h);`,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet({
            contentSecurityPolicy: true,
          })
        );`,
    },
    {
      code: `
        const helmet = require('helmet');
        module.exports = function (app) {
          app.use(
            helmet({
              contentSecurityPolicy: true,
            })
          );
        }`,
    },
    {
      code: `
        const helmet = require('helmet');
        module.exports = function (foo) {
          app.use(
            helmet({
              contentSecurityPolicy: false,
            })
          );
        }`,
    },
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(
          unknown({
            contentSecurityPolicy: false,
          })
        );`,
    },
    {
      code: `
        const express = require('express');
        const app = express();
        app.use('/endpoint', callback);`,
    },
  ],
  invalid: [
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet({
            contentSecurityPolicy: false, // Noncompliant
          })
        );`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure not enabling content security policy fetch directives is safe here.`,
            secondaryLocations: [
              {
                column: 12,
                line: 7,
                endColumn: 40,
                endLine: 7,
              },
            ],
          }),
          line: 5,
          endLine: 9,
          column: 9,
          endColumn: 10,
        },
      ],
    },
    {
      code: `
        const helmet = require('helmet');
        module.exports = function (app) {
          app.use(
            helmet({
              contentSecurityPolicy: false, // Noncompliant
            })
          );
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure not enabling content security policy fetch directives is safe here.`,
            secondaryLocations: [
              {
                column: 14,
                line: 6,
                endColumn: 42,
                endLine: 6,
              },
            ],
          }),
          line: 4,
          endLine: 8,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
        const helmet = require('helmet');
        module.exports.sensitiveCsp = function (app) {
          app.use(
            helmet({
              contentSecurityPolicy: false, // Noncompliant
            })
          );
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure not enabling content security policy fetch directives is safe here.`,
            secondaryLocations: [
              {
                column: 14,
                line: 6,
                endColumn: 42,
                endLine: 6,
              },
            ],
          }),
          line: 4,
          endLine: 8,
          column: 11,
          endColumn: 12,
        },
      ],
    },
  ],
});
