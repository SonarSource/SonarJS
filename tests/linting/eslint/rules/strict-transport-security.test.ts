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
import { rule } from '@sonar/jsts/rules/strict-transport-security';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Disabling Strict-Transport-Security policy is security-sensitive', rule, {
  valid: [
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet()
          );`,
    },
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet({
              hsts: true,
            })
          );`,
    },
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet.hsts({})
          );`,
    },
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet.hsts({
              maxAge: 31536000,
            })
          );`,
    },
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet.hsts({
              maxAge: 31536000,
              includeSubDomains: true,
            })
          );`,
    },
    {
      code: `
          const hsts = require('hsts');
          const express = require('express');
          const app = express();
          app.use(
            hsts({})
          );`,
    },
    {
      code: `
          const hsts = require('hsts');
          const express = require('express');
          const app = express();
          app.use(
            hsts({
              maxAge: 31536000,
            })
          );`,
    },
    {
      code: `
          const hsts = require('hsts');
          const express = require('express');
          const app = express();
          app.use(
            hsts({
              maxAge: 31536000,
              includeSubDomains: true,
            })
          );`,
    },
    {
      code: `
          const hsts = require('hsts');
          const express = require('express');
          const app = express();
          app.use(
            hsts({
              maxAge: unknown,
              includeSubDomains: true,
            })
          );`,
    },
    {
      code: `
          const express = require('express');
          const app = express();
          app.use(
            whatever({
              maxAge: 31536000,
              includeSubDomains: true,
            })
          );`,
    },
    {
      code: `
          const express = require('express');
          const app = express();
          app.use(
            unknown.whatever({
              maxAge: 31536000,
              includeSubDomains: true,
            })
          );`,
    },
  ],
  invalid: [
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet({
              hsts: false,
            })
          );`,
      errors: [
        {
          message: JSON.stringify({
            message: `Disabling Strict-Transport-Security policy is security-sensitive.`,
            secondaryLocations: [
              {
                column: 14,
                line: 7,
                endColumn: 25,
                endLine: 7,
              },
            ],
          }),
          line: 5,
          endLine: 9,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
          const helmet = require('helmet')
          const express = require('express');
          const app = express();
          app.use(
            helmet.hsts({
              maxAge: 3153600,
              includeSubDomains: false,
            })
          );`,
      errors: [
        {
          message: JSON.stringify({
            message: `Disabling Strict-Transport-Security policy is security-sensitive.`,
            secondaryLocations: [
              {
                column: 14,
                line: 7,
                endColumn: 29,
                endLine: 7,
              },
            ],
          }),
          line: 5,
          endLine: 10,
          column: 11,
          endColumn: 12,
        },
        {
          message: JSON.stringify({
            message: `Disabling Strict-Transport-Security policy is security-sensitive.`,
            secondaryLocations: [
              {
                column: 14,
                line: 8,
                endColumn: 38,
                endLine: 8,
              },
            ],
          }),
          line: 5,
          endLine: 10,
          column: 11,
          endColumn: 12,
        },
      ],
    },
    {
      code: `
          const hsts = require('hsts');
          const express = require('express');
          const app = express();
          app.use(
            hsts({
              maxAge: 3153600,
              includeSubDomains: false,
            })
          );`,
      errors: 2,
    },
  ],
});
