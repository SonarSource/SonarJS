/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

import { rule } from 'rules/x-powered-by';

ruleTester.run(
  'Recovering fingerprints from web application technologies should not be possible',
  rule,
  {
    valid: [
      {
        code: `
        const express = require('express');
        const app = express();
        app.disable("x-powered-by"); // Compliant
      `,
      },
      {
        code: `
        const express = require('express');
        const hidePoweredBy = require('hide-powered-by');
        const app = express();
        app.use(hidePoweredBy()); // Compliant
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.set("x-powered-by", false); // Compliant
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.set("X-PoWeReD-bY", false); // Compliant
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(require('helmet')()); // Compliant
      `,
      },
      {
        code: `
        import express from 'express';
        import disableXPoweredBy from 'hide-powered-by';
        const app = express();
        app.use(disableXPoweredBy()); // Compliant
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        const helmet = require('helmet');
        const h = helmet();
        app.use(h);
      `,
      },
      {
        code: `
        // middleware instance is saved to variable instead of directly passed to 'app.use()'
        const express = require('express');
        const helmet = require('helmet');
        const helmetInstance = helmet();
        const app = express();
        app.use(helmetInstance); // compliant
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        configure(app); // app escapes, probably configured elsewhere.
      `,
      },
      {
        code: `
        const express = require('express');
        const helmet = require('helmet');
        const app = express();
        app.use(helmet.hidePoweredBy());
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(require('helmet').hidePoweredBy());
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(a, b, [c, d, require('helmet')(), e, f], g, h);
      `,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        const helmet = require('helmet');
        const securityMiddlewares = [
          armor(),
          helmet(),
          sword(),
          horse(),
        ];
        app.use(usefulStuff, securityMiddlewares, moreStuff);
      `,
      },
      {
        code: `
          const { app } = apps[42]; // Compliant (not obviously an express-app, ignored)
          const app2 = apps[42];
          const { subcomponent } = require('express')();
          apps[42] = require('express')(); // Limitation: we don't keep track of 'app' here.
        `,
      },
      {
        code: `
          const express = require('express');
          module.exports.createExpressApp = function() {
            var appEscaping = express(); // should be compliant, because express object is returned from the function
            return appEscaping;
          };
        `,
      },
      {
        code: `
          const express = require('express');
          function f() {
            return 42; // a return before the application is discovered, for coverage
          }
          module.exports.createExpressApp = function() {
            var appEscaping = express();
            return appEscaping;
          };
        `,
      },
    ],
    invalid: [
      {
        code: `
        const express = require('express');
        const app = express(); // Noncompliant
      `,
        errors: [
          {
            message: 'Make sure disclosing the fingerprinting of this web technology is safe here.',
            line: 3,
            endLine: 3,
            column: 15,
            endColumn: 18,
          },
        ],
      },
      {
        code: `
        import * as express from 'express';
        const app = express(); // Noncompliant
      `,
        errors: [
          {
            message: 'Make sure disclosing the fingerprinting of this web technology is safe here.',
            line: 3,
            endLine: 3,
            column: 15,
            endColumn: 18,
          },
        ],
      },
      {
        code: `
        const app = require('express')(); // Noncompliant
      `,
        errors: [
          {
            message: 'Make sure disclosing the fingerprinting of this web technology is safe here.',
            line: 2,
            endLine: 2,
            column: 15,
            endColumn: 18,
          },
        ],
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.set("x-powered-by", true); // Noncompliant
      `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const app = express();
      `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const theforce = require('the-force');
        const app = express();
        app.use(theforce()); // That doesn't help here.
        app.use(somethingunknown()); // That doesn't help either.
      `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const helmet = require('helmet');
        const helmetInst = helmet();
        const app = express();
        // imported, but forgot to use helmet
      `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(a, b, [c, d, require('sth-useless')(), e, f], g, h);
        `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        const securityMiddlewares = [
          armor(),
          sword(),
          horse(),
        ];
        app.use(usefulStuff, securityMiddlewares, something.unknown());
        `,
        errors: 1,
      },
      {
        code: `
          const express = require('express');
          module.exports.createExpressApp = function() {
            var appEscaping = express();
            return appEscaping.someSubproperty; // that's not sufficient, does not count as escaped app.
          };
        `,
        errors: 1,
      },
    ],
  },
);
