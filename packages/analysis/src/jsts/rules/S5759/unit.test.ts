/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './rule.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S5759', () => {
  it('S5759', () => {
    const ruleTester = new DefaultParserRuleTester();

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
      createProxyServer({xfwd: true});
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true, xfwd: true });`,
        },
        {
          code: `
      const httpProxy = require('http-proxy')
      httpProxy.createProxyServer({target: 'http://localhost:9000', xfwd: true})`,
        },
        {
          code: `
      const { createProxyServer } = require('http-proxy')
      createProxyServer({target: 'http://localhost:9000', xfwd: true})`,
        },
      ],
      invalid: [
        {
          code: `
      const { createProxyMiddleware } = require('http-proxy-middleware');
      createProxyMiddleware({ target: 'http://localhost:9000', changeOrigin: true, xfwd: true });`,
          errors: 1,
        },
      ],
    });
  });
});
