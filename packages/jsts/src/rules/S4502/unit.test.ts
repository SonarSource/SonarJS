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
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

const EXPECTED_MESSAGE_DISABLING = 'Make sure disabling CSRF protection is safe here.';

ruleTester.run('Disabling CSRF protections is security-sensitive', rule, {
  valid: [
    {
      code: `
        var app = express();
        var csrf = require('csurf');
        var csrfProtection = csrf({ cookie: { httpOnly: true, secure:true }})
        app.use(csrfProtection);
        
        app.post('/process', parseForm, function (req, res) { // OK, uses global config
          res.send('data is being processed')
        });
      `,
    },
    {
      code: `
      var app = express();
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: { httpOnly: true, secure:true}, ignoreMethods: [] });
      var csrfProtection2 = csrf({ cookie: { httpOnly: true, secure:true}, ignoreMethods: bar() });
      `,
    },
    {
      code: `
      app.post('/process', function (req, res) { // ok as 'csurf' is not imported
        res.send('data is being processed');
      });
      `,
    },
    {
      code: `
        var app = express();
        var csrf = require('csurf');
        var csrfProtection = csrf({ cookie: { httpOnly: true, secure:true }})
        const security = [
          csrfProtection,
          require('protection-from-porcupines-falling-from-a-poorly-maintained-helicopter')()
        ];
        app.use(somethingElse, security);
        
        app.post('/process', parseForm, function (req, res) { // OK, uses global config
          res.send('data is being processed')
        });
      `,
    },
  ],
  invalid: [
    {
      code: `
      var app = express();
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: { httpOnly: true, secure:true}, ignoreMethods: ["POST", "PUT", "GET"] }); // Sensitive
      `,
      errors: [
        {
          message: encodedMessage(EXPECTED_MESSAGE_DISABLING, {
            line: 4,
            column: 98,
            endColumn: 103,
            endLine: 4,
          }),
          line: 4,
          endLine: 4,
          column: 91,
          endColumn: 97,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        var app = express();
        var csrf = require('csurf');
        var csrfProtection = csrf({ cookie: { httpOnly: true, secure:true }})
        
        app.post('/process', parseForm, function (req, res) { // Sensitive
          res.send('data is being processed')
        }) 
      `,
      errors: 1,
    },
    {
      code: `
        var csrf = require('csurf');
        app.post('/process', function (req, res) { // Sensitive: csrf used after
          res.send('data is being processed');
        }); 
        app.use(csrf({ cookie: true }));
      `,
      errors: [
        {
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 17,
          message: encodedMessage('Make sure not using CSRF protection is safe here.'),
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        import csrf from 'csurf';
        app.post('/process', function (req, res) {
          res.send('data is being processed');
        });
      `,
      errors: [
        {
          line: 3,
        },
      ],
    },
  ],
});

function encodedMessage(
  message: string,
  secondary?: { line: number; column: number; endColumn: number; endLine: number },
) {
  let secondaryLocations = [];
  if (secondary) {
    secondaryLocations = [
      {
        column: secondary.column,
        line: secondary.line,
        endColumn: secondary.endColumn,
        endLine: secondary.endLine,
      },
    ];
  }
  return JSON.stringify({
    message,
    secondaryLocations,
  });
}
