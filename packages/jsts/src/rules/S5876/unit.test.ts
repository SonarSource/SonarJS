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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
ruleTester.run(
  'Create a new session during user authentication to prevent session fixation attacks.',
  rule,
  {
    valid: [
      {
        code: `
      var passport = require('passport');
      
      app.post('/login', 
      passport.authenticate('local', { failureRedirect: '/login' }),
      function(req, res) {
        let prevSession = req.session;
        req.session.regenerate((err) => {  // Compliant
          Object.assign(req.session, prevSession);
          res.redirect('/');
        });
        console.log('coverage');
      });`,
      },
      {
        code: `
      var passport = require('passport');
      passport.authenticate('local', { failureRedirect: '/login' });
      `,
      },
      {
        code: `
      var passport = require('passport');      
      app.post('/login', passport.authenticate('local', { failureRedirect: '/login' }),  foo);            
    `,
      },
      {
        code: `
        var passport = require('passport');
        app.post('/api/login', 
        passport.authenticate('local', { session: false }), // Compliant - no session
        function(req, res) {
          res.redirect('/');
        });
      `,
      },
    ],
    invalid: [
      {
        code: `
      var passport = require('passport');
      
      app.post('/login', 
      passport.authenticate('local', { failureRedirect: '/login' }),
      function(req, res) {
        // Sensitive - no session.regenerate after login
        res.redirect('/');
      });`,
        errors: [
          {
            message:
              'Create a new session during user authentication to prevent session fixation attacks.',
            line: 6,
            column: 7,
            endLine: 9,
            endColumn: 8,
          },
        ],
      },
      {
        code: `
        var passport = require('passport');
        app.post('/api/login', 
        passport.authenticate('local', { session: true }),
        function(req, res) {
          res.redirect('/');
        });
      `,
        errors: 1,
      },
      {
        code: `
        var passport = require('passport');
        app.post('/api/login', 
        passport.authenticate('local', foo()), // could be FP if foo() sets session to false
        function(req, res) {
          res.redirect('/');
        });
      `,
        errors: 1,
      },
    ],
  },
);
