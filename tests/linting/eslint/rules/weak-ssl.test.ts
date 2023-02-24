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
import { rule } from 'linting/eslint/rules/weak-ssl';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const minMaxVersion = {
  valid: [
    {
      code: `
      const tls = require('tls');
      const constants = require('constants');
      tls.connect({
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.2'
      });
      
      tls.connect(port, {
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      });
      
      tls.connect(port, url, {
        minVersion: 'TLSv1.3',
        maxVersion: 'TLSv1.3'
      });
    `,
    },
  ],
  invalid: [
    {
      code: `
      const tls = require('node:tls');
      const constants = require('constants');
      tls.connect({
        minVersion: 'TLSv1.1',
      });
      `,
      errors: 1,
    },
    {
      code: `
      const tls = require('tls');
      const constants = require('constants');
      tls.connect({
        minVersion: 'TLSv1.1',
        maxVersion: 'TLSv1.2'
      });
      `,
      errors: [
        {
          message: "Change 'minVersion' to use at least TLS v1.2.",
          line: 5,
          column: 21,
          endLine: 5,
          endColumn: 30,
        },
      ],
    },
    {
      code: `
      const tls = require('tls');
      const constants = require('constants');
      tls.connect({
        minVersion: 'TLSv1.1',
        maxVersion: 'TLSv1.1'
      });
      
      tls.connect(port, {
        minVersion: 'TLSv1.1',
      });
      
      tls.connect(port, url, {
        maxVersion: 'TLSv1.1'
      });
    `,
      errors: 4,
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');
      
      var options23 = {
        minVersion: 'TLSv1.1',  // Noncompliant
        maxVersion: 'TLSv1.1' // Noncompliant
      }
      
      var req23 = https.request(options23);
      `,
      errors: [
        {
          message: "Change 'minVersion' to use at least TLS v1.2.",
          line: 6,
          column: 21,
          endLine: 6,
          endColumn: 30,
        },
        {
          message: "Change 'maxVersion' to use at least TLS v1.2.",
          line: 7,
          column: 21,
          endLine: 7,
          endColumn: 30,
        },
      ],
    },
    {
      code: `
      const https = require('node:https');
      const constants = require('node:constants');

      var options23 = {
        minVersion: 'TLSv1.1',  // Noncompliant
        maxVersion: 'TLSv1.1' // Noncompliant
      }

      var req23 = https.request(options23);
      `,
      errors: 2,
    },
    {
      code: `
        const request = require('request');
        const constants = require('constants');

        var socket25 = request.get({
            url: 'https://www.google.com/',
            minVersion: 'TLSv1.1',  // Noncompliant
            maxVersion: 'TLSv1.1' // Noncompliant
        }); // Noncompliant
      `,
      errors: 2,
    },
  ],
};

const secureProtocol = {
  valid: [
    {
      code: `
      const request = require('request');
      const constants = require('constants');
      
      var socket5 = request.get({
          url: 'https://www.google.com/',
                    
          secureProtocol: 'TLSv1_2_method' // Compliant
      });
      `,
    },
    {
      code: `
    const https = require('https');
    
    var options17 = {
      hostname: 'www.google.com',
      port: 443,
      path: '/',
      method: 'GET',
      secureProtocol: 'TLSv1_2_method'
    };

    https.request(options17, (res) => {
      console.log('statusCode:', res.statusCode);
      console.log('headers:', res.headers);
    
      res.on('data', (d) => {
        process.stdout.write(d);
      });
    }); `,
    },
  ],
  invalid: [
    {
      code: `
      const https = require('https');
      const constants = require('constants');
      var options5 = {
        secureProtocol: 'SSLv3_method'
      }

      var req5 = https.request(options5);      
      `,
      errors: [
        {
          message: "Change 'secureProtocol' to use at least TLS v1.2.",
          line: 5,
          column: 25,
          endLine: 5,
          endColumn: 39,
        },
      ],
    },
    {
      code: `
      const request = require('request');
      const constants = require('constants');
      
      var socket18 = request.get({
          url: 'https://www.google.com/',
          secureProtocol: 'DTLSv1_client_method' // Noncompliant
      });
      `,
      errors: 1,
    },
  ],
};

const secureOptions = {
  valid: [
    {
      code: `
        var options3 = {
          hostname: 'www.google.com',
          port: 443,
          path: '/',
          method: 'GET',
          secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1
        };
        
        var req3 = https.request(options3, (res) => {
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
      const constants = require('constants');
      
      var options = {
        hostname: 'www.google.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: opts() | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1
      };
      
      var req = https.request(options, (res) => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);
      
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
        hostname: 'www.google.com',
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
      });
            `,
      errors: [
        {
          line: 10,
          column: 9,
          endLine: 10,
          endColumn: 105,
          message: "Change 'secureOptions' to allow only secure TLS versions.",
        },
      ],
    },
    {
      code: `        
        const tls = require('tls');
        const constants = require('constants');
        var options1 = {
          secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1 
        };
        
        tls.createSecureContext(options1);    
      `,
      errors: 1,
    },
    {
      code: `        
        const tls = require('tls');
        const c = require('constants');
        var options1 = {
          secureOptions: c.SSL_OP_NO_SSLv2 | c.SSL_OP_NO_SSLv3 | c.SSL_OP_NO_TLSv1 
        };
        
        tls.createSecureContext(options1);    
      `,
      errors: 1,
    },
  ],
};

ruleTesterJs.run('Should use strong TLS: minMaxVersion', rule, minMaxVersion);
ruleTesterJs.run('Should use strong TLS: secureProtocol', rule, secureProtocol);
ruleTesterJs.run('Should use strong TLS: secureOptions', rule, secureOptions);
