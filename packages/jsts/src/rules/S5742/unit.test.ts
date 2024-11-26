/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './index.js';
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});
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
        const h = helmet({ expectCt: true });
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
        const helmet = require('helmet');
        module.exports = function (app) {
          app.use(
            helmet({
              expectCt: true,
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
              expectCt: false,
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
        const app = express();
        app.use(
          helmet({
            expectCt: false, // Noncompliant
          })
        );`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure disabling Certificate Transparency monitoring is safe here.`,
            secondaryLocations: [
              {
                column: 12,
                line: 7,
                endColumn: 27,
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
      options: ['sonar-runtime'],
    },
    {
      code: `
        const helmet = require('helmet');
        const express = require('express');
        const app = express();
        const h = helmet({ expectCt: false }); // Noncompliant
        app.use(h);`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure disabling Certificate Transparency monitoring is safe here.`,
            secondaryLocations: [
              {
                column: 27,
                line: 5,
                endColumn: 42,
                endLine: 5,
              },
            ],
          }),
          line: 6,
          endLine: 6,
          column: 9,
          endColumn: 19,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const helmet = require('helmet');
        module.exports = function (app) {
          app.use(
            helmet({
              expectCt: false, // Noncompliant
            })
          );
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure disabling Certificate Transparency monitoring is safe here.`,
            secondaryLocations: [
              {
                column: 14,
                line: 6,
                endColumn: 29,
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
      options: ['sonar-runtime'],
    },
    {
      code: `
        const helmet = require('helmet');
        module.exports.sensitiveExpectCt = function (app) {
          app.use(
            helmet({
              expectCt: false, // Noncompliant
            })
          );
        }`,
      errors: [
        {
          message: JSON.stringify({
            message: `Make sure disabling Certificate Transparency monitoring is safe here.`,
            secondaryLocations: [
              {
                column: 14,
                line: 6,
                endColumn: 29,
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
      options: ['sonar-runtime'],
    },
  ],
});
