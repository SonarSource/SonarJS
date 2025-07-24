/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { Rule } from 'eslint';
import { RuleTester } from 'eslint';
import type estree from 'estree';
import { Express, getProperty } from '../../../src/rules/helpers/index.js';

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

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2018, sourceType: 'module' },
});
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
