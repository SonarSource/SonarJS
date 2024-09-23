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
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

import { rule } from './/index.js';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
const ruleTesterTs = new TypeScriptRuleTester();

const cookieSessionTestCases = {
  valid: [
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession({
        secret: "ddfdsfd",
        httpOnly: true,
      });
            `,
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession({
        secret: "ddfdsfd",
      }); // Compliant: by default httpOnly is set to true on https connection
            `,
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession("wrong argument");
      var session1 = cookieSession();
      let httpOnlyValue = false;
      if (x) {
        httpOnlyValue = true;
      }
      var session1 = cookieSession({
        secret: "ddfdsfd",
        httpOnly: httpOnlyValue,
      });
            `,
    },
  ],
  invalid: [
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession({
        secret: "ddfdsfd",
        httpOnly: false,
      });
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":18,"line":5,"endColumn":23,"endLine":5}]}',
          line: 3,
          endLine: 3,
          column: 22,
          endColumn: 35,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      const options = {
        secret: "ddfdsfd",
        httpOnly: false,
      };
      var session1 = cookieSession(options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":18,"line":5,"endColumn":23,"endLine":5},{"column":22,"line":3,"endColumn":7,"endLine":6}]}',
          line: 7,
          endLine: 7,
          column: 22,
          endColumn: 35,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      const ishttpOnly = false;
      const options = {
        secret: "ddfdsfd",
        httpOnly: ishttpOnly,
      };
      var session1 = cookieSession(options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":25,"line":3,"endColumn":30,"endLine":3},{"column":22,"line":4,"endColumn":7,"endLine":7}]}',
          line: 8,
          endLine: 8,
          column: 22,
          endColumn: 35,
        },
      ],
      options: ['sonar-runtime'],
    },
  ],
};

const cookiesTestCases = {
  valid: [
    {
      code: `
          var Cookies = require('cookies');
          var cookies = new Cookies(req, res, 
            { 
              keys: keys 
            });
          var lastVisit = cookies.get('LastVisit', { 
            signed: true
          }); // Compliant: by default httpOnly is set to true on https connection
          cookies.set('LastVisit', new Date().toISOString(), { signed: true });
            `,
    },
    {
      code: `
          var Cookies = require('cookies')
          var cookies = new Cookies(req, res, 
            { 
              keys: keys 
            });
          var lastVisit = cookies.get('LastVisit', { signed: true })
          cookies.set('LastVisit', new Date().toISOString(), { 
            signed: true,
            httpOnly: true 
          });
            `,
    },
    {
      code: `
          var Cookies = require('cookies')
          var cookies = new Cookies(req, res, 
            { 
              keys: keys 
            });
          var lastVisit = cookies.get('LastVisit', { signed: true })
          cookies.set('LastVisit', new Date().toISOString(), "unknown");
          cookies.set('LastVisit', new Date().toISOString());
          
          var httpOnlyValue = false;
          if (x) {
            httpOnlyValue = true;
          }
          cookies.set('LastVisit', new Date().toISOString(), { 
            signed: true,
            httpOnly: httpOnlyValue 
          });
            `,
    },
  ],
  invalid: [
    {
      code: `
      var Cookies = require('cookies');
      var cookies = new Cookies(req, res, { keys: keys });
      cookies.set('LastVisit', new Date().toISOString(), { 
        signed: true,
        httpOnly: false
      });
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":18,"line":6,"endColumn":23,"endLine":6}]}',
          line: 4,
          endLine: 4,
          column: 7,
          endColumn: 18,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      var Cookies = require('cookies');
      var cookies = new Cookies(req, res, { keys: keys });
      var options = { 
        signed: true,
        httpOnly: false
      };
      cookies.set('LastVisit', new Date().toISOString(), options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":18,"line":6,"endColumn":23,"endLine":6},{"column":20,"line":4,"endColumn":7,"endLine":7}]}',
          line: 8,
          endLine: 8,
          column: 7,
          endColumn: 18,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      var Cookies = require('cookies');
      var cookies = new Cookies(req, res, { keys: keys });
      var httpOnly = false;
      var options = { 
        signed: true,
        httpOnly
      };
      cookies.set('LastVisit', new Date().toISOString(), options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":21,"line":4,"endColumn":26,"endLine":4},{"column":20,"line":5,"endColumn":7,"endLine":8}]}',
          line: 9,
          endLine: 9,
          column: 7,
          endColumn: 18,
        },
      ],
      options: ['sonar-runtime'],
    },
  ],
};

const csurfTestCases = {
  valid: [
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: { httpOnly: true }});
            `,
    },
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf("unknown argument");
      var csrfProtection = csrf({ cookie: "unknown"});
      var csrfProtection = csrf({ unknownProperty: "unknown"});
      var csrfProtection = csrf();
      var httpOnlyValue = false;
      if (x) {
        httpOnlyValue = true;
      }
      var csrfProtection = csrf({ cookie: { httpOnly: httpOnlyValue}});
      var cookieValue = false;
      if (x) {
        cookieValue = true;
      }
      var csrfProtection = csrf({ cookie: cookieValues});
            `,
    },
  ],
  invalid: [
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: { httpOnly: false }}); // Sensitive
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":54,"line":3,"endColumn":59,"endLine":3}]}',
          line: 3,
          endLine: 3,
          column: 28,
          endColumn: 32,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      var csrf = require('csurf');
      var cookieObject = {cookie: {httpOnly : false}};
      var csrfProtection = csrf(cookieObject); // Sensitive
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":46,"line":3,"endColumn":51,"endLine":3},{"column":25,"line":3,"endColumn":53,"endLine":3}]}',
          line: 4,
          endLine: 4,
          column: 28,
          endColumn: 32,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: true}); // Sensitive
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"httpOnly\\" flag is safe.","secondaryLocations":[{"column":42,"line":3,"endColumn":46,"endLine":3}]}',
          line: 3,
          endLine: 3,
          column: 28,
          endColumn: 32,
        },
      ],
      options: ['sonar-runtime'],
    },
  ],
};

const expressSessionTestCases = {
  valid: [
    {
      code: `
      var express = require('express');
      var session = require('express-session');
      
      var app = express();
      app.set('trust proxy', 1); // trust first proxy
      
      app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: 
        { 
        }
      })) // Compliant: by default httpOnly is set to true on https
           `,
    },
    {
      code: `
      var express = require('express');
      var session = require('express-session');

      var app = express();
      app.set('trust proxy', 1); // trust first proxy

      app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: 
        { 
          httpOnly: true // Compliant
        }
      }));
            `,
    },
    {
      code: `
      var express = require('express');
      var session = require('express-session');

      var app = express();
      app.set('trust proxy', 1); // trust first proxy

      let cookieValue = { 
        httpOnly: false
      };
      if (x) {
        cookieValue = { 
          httpOnly: true
        }
      }
      app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: cookieValue
      }));
            `,
    },
  ],
  invalid: [
    {
      code: ` 
      var express = require('express');
      var session = require('express-session');

      var app = express()
      app.set('trust proxy', 1) // trust first proxy

      app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        cookie: 
        { 
          httpOnly: false // Sensitive
        }
      }));
            `,
      errors: 1,
    },
  ],
};

ruleTesterJs.run(
  '[JS express-session] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  expressSessionTestCases,
);
ruleTesterTs.run(
  '[TS express-session] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  expressSessionTestCases,
);

ruleTesterJs.run(
  '[JS cookie-session] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  cookieSessionTestCases,
);
ruleTesterTs.run(
  '[TS cookie-session] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  cookieSessionTestCases,
);

ruleTesterJs.run(
  '[JS cookies] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  cookiesTestCases,
);
ruleTesterTs.run(
  '[TS cookies] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  cookiesTestCases,
);

ruleTesterJs.run(
  '[JS csurf] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  csurfTestCases,
);
ruleTesterTs.run(
  '[TS csurf] Creating cookies without the "httpOnly" flag is security-sensitive',
  rule,
  csurfTestCases,
);
