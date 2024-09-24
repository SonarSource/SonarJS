/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { rule } from './/index.ts';

const message = 'Make sure serving hidden files is safe here.';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
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
import * as serveStatic from 'serve-static';
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
