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

const message = 'Make sure serving hidden files is safe here.';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});
ruleTester.run('Statically serving hidden files is security-sensitive', rule, {
  valid: [
    {
      code: `
const express = require('express');
const serveStatic = require('serve-static');

let app = express();

app.use(serveStatic('public', 
                    { 'index': false, 
                      'dotfiles': 'ignore' // Compliant
                    }));

app.use(serveStatic('public', 
                    { 'index': false, 
                      'dotfiles': 'deny' // Compliant
                    }));

app.use(serveStatic('public', 
                    { 'index': false, 
                      'dotfiles': unknown // Compliant
                    }));

app.use(serveStatic('public')); // Compliant by default
app.use(serveStatic('public', { 'index': false })); // Compliant by default
      `,
    },
  ],
  invalid: [
    {
      code: `
const express = require('express');
const serveStatic = require('serve-static');
let app = express();
app.use(serveStatic('public', 
                    { 'index': false, 
                      'dotfiles': 'allow' // Sensitive
                    }));
      `,
      errors: [
        {
          message,
          line: 7,
          endLine: 7,
          column: 23,
          endColumn: 42,
        },
      ],
    },
    {
      code: `
import serveStatic from 'serve-static';
let app = express();
const options = { 
  'index': false, 
  'dotfiles': 'allow' // Sensitive
};
app.use(serveStatic('public', options));
      `,
      errors: [
        {
          message,
          line: 6,
          endLine: 6,
          column: 3,
          endColumn: 22,
        },
      ],
    },
  ],
});
