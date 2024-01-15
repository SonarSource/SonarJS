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
import { rule } from './';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const testCasesHttps = {
  valid: [
    {
      code: `
    const https = require('https');

    var options = {
      hostname: 'self-signed.badssl.com',
      port: 443,
      path: '/',
      method: 'GET',
      secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
      rejectUnauthorized: true 
    };
    
    var req = https.request(options, (res) => {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);
    
      res.on('data', (d) => {
        process.stdout.write(d);
      });
    }); // Compliant
          `,
    },
    {
      code: `
    const https = require('https');

    var options = {
      hostname: 'self-signed.badssl.com',
      port: 443,
      path: '/',
      method: 'GET',
      secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1
    };
    
    var req = https.request(options, (res) => {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);
    
      res.on('data', (d) => {
        process.stdout.write(d);
      });
    }); // Compliant
          `,
    },
    {
      code: `
      const https = require('https');
      var req = https.request();
          `,
    },
    {
      code: `
      const https = require('https');

      var options = getOptions();
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {
          process.stdout.write(d);
        });
      });
          `,
    },
  ],
  invalid: [
    {
      code: `
    const https = require('https');
    const constants = require('constants');

    var options = {
      hostname: 'self-signed.badssl.com',
      port: 443,
      path: '/',
      method: 'GET',
      secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
      rejectUnauthorized: false  // Noncompliant
    };

    var req = https.request(options, (res) => {
      res.on('data', (d) => {});
    }); // Noncompliant
          `,
      errors: [
        {
          line: 14,
          endLine: 14,
          column: 15,
          endColumn: 28,
          message: JSON.stringify({
            message: 'Enable server certificate validation on this SSL/TLS connection.',
            secondaryLocations: [
              {
                column: 18,
                line: 5,
                endColumn: 5,
                endLine: 12,
              },
              {
                message: 'Set "rejectUnauthorized" to "true".',
                column: 6,
                line: 11,
                endColumn: 31,
                endLine: 11,
              },
            ],
          }),
        },
      ],
    },
    {
      code: `
    const https = require('node:https');
    const constants = require('node:constants');

    var options = {
      hostname: 'self-signed.badssl.com',
      port: 443,
      path: '/',
      method: 'GET',
      secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
      rejectUnauthorized: false  // Noncompliant
    };

    var req = https.request(options, (res) => {
      res.on('data', (d) => {});
    }); // Noncompliant
          `,
      errors: 1,
    },
  ],
};
const testCasesRequest = {
  valid: [
    {
      code: `
      const request = require('request');

      var socket = request.get({
        url: 'https://self-signed.badssl.com',
        secureProtocol: 'TLSv1_2_method',
        rejectUnauthorized: true
      }); // Compliant        
            `,
    },
    {
      code: `
      const request = require('request');

      var socket = request.get({
        url: 'https://self-signed.badssl.com',
        secureProtocol: 'TLSv1_2_method'
        //rejectUnauthorized: true // by default is set to true
      }); // Compliant
            `,
    },
  ],
  invalid: [
    {
      code: `
      const request = require('request');

      var socket = request.get({
          url: 'https://self-signed.badssl.com',
          secureProtocol: 'TLSv1_2_method',
          rejectUnauthorized: false  // Noncompliant
      }); // Noncompliant
            `,
      errors: 1,
    },
  ],
};
const testCasesTls = {
  valid: [
    {
      code: `
      var options = {
        rejectUnauthorized: true
      };
      
      var socket = tls.connect(443, "self-signed.badssl.com", options, () => {}); // Compliant
            `,
    },
  ],
  invalid: [
    {
      code: `
      const tls = require('tls');

      var options = {
          rejectUnauthorized: false  // Noncompliant
      };
      var socket = tls.connect(443, "self-signed.badssl.com", options, () => {}); // Noncompliant
            `,
      errors: 1,
    },
    {
      code: `
      const tls = require('node:tls');

      var options = {
          rejectUnauthorized: false  // Noncompliant
      };
      var socket = tls.connect(443, "self-signed.badssl.com", options, () => {}); // Noncompliant
            `,
      errors: 1,
    },
  ],
};
ruleTesterJs.run(
  '[https] Server certificates should be verified during SSL⁄TLS connections',
  rule,
  testCasesHttps,
);
ruleTesterJs.run(
  '[request] Server certificates should be verified during SSL⁄TLS connections',
  rule,
  testCasesRequest,
);
ruleTesterJs.run(
  '[tls] Server certificates should be verified during SSL⁄TLS connections',
  rule,
  testCasesTls,
);
