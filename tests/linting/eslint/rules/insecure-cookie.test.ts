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
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from '@sonar/jsts/rules/insecure-cookie';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
const ruleTesterTs = new TypeScriptRuleTester();

const cookieSessionTestCases = {
  valid: [
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession({
        secret: "ddfdsfd",
        secure: true,
      });
            `,
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession({
        secret: "ddfdsfd",
      }); // Compliant: by default secure is set to true on https connection
            `,
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      var session1 = cookieSession("wrong argument");
      var session1 = cookieSession();
      let secureValue = false;
      if (x) {
        secureValue = true;
      }
      var session1 = cookieSession({
        secret: "ddfdsfd",
        secure: secureValue,
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
        secure: false,
      });
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":16,"line":5,"endColumn":21,"endLine":5}]}',
          line: 3,
          endLine: 3,
          column: 22,
          endColumn: 35,
        },
      ],
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      const options = {
        secret: "ddfdsfd",
        secure: false,
      };
      var session1 = cookieSession(options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":16,"line":5,"endColumn":21,"endLine":5},{"column":22,"line":3,"endColumn":7,"endLine":6}]}',
          line: 7,
          endLine: 7,
          column: 22,
          endColumn: 35,
        },
      ],
    },
    {
      code: `
      var cookieSession = require('cookie-session');
      const isSecure = false;
      const options = {
        secret: "ddfdsfd",
        secure: isSecure,
      };
      var session1 = cookieSession(options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":23,"line":3,"endColumn":28,"endLine":3},{"column":22,"line":4,"endColumn":7,"endLine":7}]}',
          line: 8,
          endLine: 8,
          column: 22,
          endColumn: 35,
        },
      ],
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
          }); // Compliant: by default secure is set to true on https connection
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
            secure: true 
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
          
          var secureValue = false;
          if (x) {
            secureValue = true;
          }
          cookies.set('LastVisit', new Date().toISOString(), { 
            signed: true,
            secure: secureValue 
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
        secure: false
      });
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":16,"line":6,"endColumn":21,"endLine":6}]}',
          line: 4,
          endLine: 4,
          column: 7,
          endColumn: 18,
        },
      ],
    },
    {
      code: `
      var Cookies = require('cookies');
      var cookies = new Cookies(req, res, { keys: keys });
      var options = { 
        signed: true,
        secure: false
      };
      cookies.set('LastVisit', new Date().toISOString(), options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":16,"line":6,"endColumn":21,"endLine":6},{"column":20,"line":4,"endColumn":7,"endLine":7}]}',
          line: 8,
          endLine: 8,
          column: 7,
          endColumn: 18,
        },
      ],
    },
    {
      code: `
      var Cookies = require('cookies');
      var cookies = new Cookies(req, res, { keys: keys });
      var secure = false;
      var options = { 
        signed: true,
        secure
      };
      cookies.set('LastVisit', new Date().toISOString(), options);
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":19,"line":4,"endColumn":24,"endLine":4},{"column":20,"line":5,"endColumn":7,"endLine":8}]}',
          line: 9,
          endLine: 9,
          column: 7,
          endColumn: 18,
        },
      ],
    },
  ],
};

const csurfTestCases = {
  valid: [
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: { secure: true }});
            `,
    },
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf("unknown argument");
      var csrfProtection = csrf({ cookie: "unknown"});
      var csrfProtection = csrf({ unknownProperty: "unknown"});
      var csrfProtection = csrf();
      var secureValue = false;
      if (x) {
        secureValue = true;
      }
      var csrfProtection = csrf({ cookie: { secure: secureValue}});
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
      var csrfProtection = csrf({ cookie: { secure: false }}); // Sensitive
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":52,"line":3,"endColumn":57,"endLine":3}]}',
          line: 3,
          endLine: 3,
          column: 28,
          endColumn: 32,
        },
      ],
    },
    {
      code: `
      var csrf = require('csurf');
      var cookieObject = {cookie: {secure : false}};
      var csrfProtection = csrf(cookieObject); // Sensitive
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":44,"line":3,"endColumn":49,"endLine":3},{"column":25,"line":3,"endColumn":51,"endLine":3}]}',
          line: 4,
          endLine: 4,
          column: 28,
          endColumn: 32,
        },
      ],
    },
    {
      code: `
      var csrf = require('csurf');
      var csrfProtection = csrf({ cookie: true}); // Sensitive
            `,
      errors: [
        {
          message:
            '{"message":"Make sure creating this cookie without the \\"secure\\" flag is safe.","secondaryLocations":[{"column":42,"line":3,"endColumn":46,"endLine":3}]}',
          line: 3,
          endLine: 3,
          column: 28,
          endColumn: 32,
        },
      ],
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
      })) // Compliant: by default secure is set to true on https
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
          secure: true // Compliant
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
        secure: false
      };
      if (x) {
        cookieValue = { 
          secure: true
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
          secure: false // Sensitive
        }
      }));
            `,
      errors: 1,
    },
  ],
};

ruleTesterJs.run(
  '[JS express-session] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  expressSessionTestCases,
);
ruleTesterTs.run(
  '[TS express-session] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  expressSessionTestCases,
);

ruleTesterJs.run(
  '[JS cookie-session] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  cookieSessionTestCases,
);
ruleTesterTs.run(
  '[TS cookie-session] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  cookieSessionTestCases,
);

ruleTesterJs.run(
  '[JS cookies] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  cookiesTestCases,
);
ruleTesterTs.run(
  '[TS cookies] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  cookiesTestCases,
);

ruleTesterJs.run(
  '[JS csurf] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  csurfTestCases,
);
ruleTesterTs.run(
  '[TS csurf] Creating cookies without the "secure" flag is security-sensitive',
  rule,
  csurfTestCases,
);
