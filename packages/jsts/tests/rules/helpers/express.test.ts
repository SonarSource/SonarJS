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
import { Rule, RuleTester } from 'eslint';
import * as estree from 'estree';
import { Express, getProperty } from '../../../src/rules';

const rule = Express.SensitiveMiddlewarePropertyRule(
  (context: Rule.RuleContext, node: estree.CallExpression): estree.Property[] => {
    const sensitives: estree.Property[] = [];
    const { callee, arguments: args } = node;
    if (callee.type === 'Identifier' && callee.name === 'middleware' && args.length === 1) {
      const [options] = args;
      const maybeFoo = getProperty(options, 'foo', context);
      if (maybeFoo) {
        sensitives.push(maybeFoo);
      }
      const maybeBar = getProperty(options, 'bar', context);
      if (maybeBar) {
        sensitives.push(maybeBar);
      }
    }
    return sensitives;
  },
  `Make sure sensitive property is safe here.`,
);

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run(
  'Express.js rule template for middlewares configured with sensitive settings',
  rule,
  {
    valid: [
      {
        code: `
        const express = require('express');
        const app = express();`,
      },
    ],
    invalid: [
      {
        code: `
        module.exports.sensitiveFoo = function (app) {
          app.use(
            middleware({
              foo: whatever
            })
          );
        }`,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(
          middleware({
            foo: whatever
          })
        ); `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(
          middleware({
            bar: whatever
          })
        ); `,
        errors: 1,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(
          middleware({
            foo: whatever,
            bar: whatever
          })
        );`,
        errors: 2,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        app.use(
          middleware({
            foo: whatever
          })
        );
        app.use(
          middleware({
            bar: whatever
          })
        );`,
        errors: 2,
      },
      {
        code: `
        const express = require('express');
        const app = express();
        module.exports.sensitiveFoo = function() {
          app.use(
            middleware({
              foo: whatever
            })
          );
        }`,
        errors: 1,
      },
    ],
  },
);
