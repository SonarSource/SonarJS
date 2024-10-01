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
import { rule } from './/index.js';
import Module from 'node:module';
const require = Module.createRequire(import.meta.url);

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTester.run('ip forwarding should be avoided', rule, {
  valid: [
    {
      code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer({target: 'http://localhost:9000'})`,
    },
    {
      code: `
      const httpProxy = require('http-proxy')
      httpProxy.other({target: 'http://localhost:9000'})`,
    },
    {
      code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer()`,
    },
    {
      code: `
      const { createProxyServer } = require('other')
      createProxyServer({xfwd: true})`,
    },
    {
      code: `
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true});`,
    },
    {
      code: `
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true});`,
    },
    {
      code: `
      createProxyServer({xfwd: true});
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true, xfwd: true });`,
    },
  ],
  invalid: [
    {
      code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer({target: 'http://localhost:9000', xfwd: true})`,
      errors: [
        {
          message: JSON.stringify({
            message: 'Make sure forwarding client IP address is safe here.',
            secondaryLocations: [{ column: 68, line: 3, endColumn: 78, endLine: 3 }],
          }),
          line: 3,
          column: 7,
          endColumn: 34,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      const { createProxyServer } = require('http-proxy')
      createProxyServer({target: 'http://localhost:9000', xfwd: true})`,
      errors: 1,
    },
    {
      code: `
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true, xfwd: true });`,
      errors: 1,
    },
  ],
});
