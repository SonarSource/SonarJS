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
ruleTester.run('Disabling strict HTTP no-referrer policy is security-sensitive', rule, {
  valid: [
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
        app.use(
          helmet({
            referrerPolicy: true,
          })
        );`,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy()
        );`,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: 'strict-origin'
          })
        );`,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: ['strict-origin']
          })
        );`,
    },
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(
          whatever({
            referrerPolicy: false,
          })
        );`,
    },
    {
      code: `
        const express = require('express');
        const app = express();
        app.use(
          unknown.whatever({
            policy: ''
          })
        );`,
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
            referrerPolicy: false,
          })
        );`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure disabling strict HTTP no-referrer policy is safe here.`,
            secondaryLocations: [
              {
                column: 12,
                line: 7,
                endColumn: 33,
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
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: ''
          })
        );`,
      errors: 1,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: 'unsafe-url'
          })
        );`,
      errors: 1,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: 'no-referrer-when-downgrade'
          })
        );`,
      errors: 1,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: ['unsafe-url']
          })
        );`,
      errors: 1,
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        app.use(
          helmet.referrerPolicy({
            policy: ['strict-origin', 'unsafe-url']
          })
        );`,
      errors: 1,
    },
  ],
});
