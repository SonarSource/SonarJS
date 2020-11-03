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
import { rule } from 'rules/certificate-transparency';
import { RuleTester } from 'eslint';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Disabling Certificate Transparency monitoring is security-sensitive', rule, {
  valid: [
    {
      code: `
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
              expectCt: true,
            })
          );`,
    },
    {
      code: `
          const express = require('express');
          const app = express();
          app.use(
            unknown({
              expectCt: false,
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
        const app = express(); // Noncompliant
        app.use(
          helmet({
            expectCt: false,
          })
        );`,
      errors: [
        {
          message: `Make sure disabling Certificate Transparency monitoring is safe here.`,
          line: 7,
          endLine: 7,
          column: 13,
          endColumn: 28,
        },
      ],
    },
  ],
});
