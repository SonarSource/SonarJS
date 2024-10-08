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
import { rule } from './index.js';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const testCasesHttps = {
  valid: [
    {
      code: `
      const https = require('https');
      const constants = require('constants');
      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        rejectUnauthorized: true,
        checkServerIdentity: (servername, peer) => {
          console.log("test2: checkServerIdentity");
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      };
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
      }); // Compliant: rejectUnauthorized to true and some checks inside checkServerIdentity
            `,
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');
      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        checkServerIdentity: (servername, peer) => {
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      };
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
      }); // Compliant: rejectUnauthorized is true by default and some checks inside checkServerIdentity
            `,
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');
      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
      };
      
      var req = https.request(options, (res) => {      
        res.on('data', (d) => {});
      }); // Compliant: rejectUnauthorized is true by default and default checkServerIdentity
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
      var options = {hostname: 'wrong.host.badssl.com',}
      if (x) {
        options = {port: 443,};
      }
      var req = https.request(options, (res) => {});
            `,
    },
    {
      code: `
      const https = require('https');
      rejectUnauthorized = false;
      if (x) {
        rejectUnauthorized = true;
      }
      var options = {rejectUnauthorized};
      var req = https.request(options, (res) => {});
            `,
    },
    {
      code: `
      const https = require('https');
      https.unknown();
            `,
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');

      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        checkServerIdentity: (a, b) => checkIdentity(a, b)
      };
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
      });
            `,
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');

      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        checkServerIdentity: function() {
          return (function() {
            return new Error();
          })();
        }
      };
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
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
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        rejectUnauthorized: false,
        checkServerIdentity: (servername, peer) => {
          console.log("test1: checkServerIdentity");
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      };
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
      }); // Noncompliant: rejectUnauthorized is false
            `,
      errors: [
        {
          line: 20,
          endLine: 20,
          column: 17,
          endColumn: 30,
          message: JSON.stringify({
            message: 'Enable server hostname verification on this SSL/TLS connection.',
            secondaryLocations: [
              {
                column: 20,
                line: 5,
                endColumn: 7,
                endLine: 18,
              },
              {
                message: 'Set "rejectUnauthorized" to "true".',
                column: 8,
                line: 11,
                endColumn: 33,
                endLine: 11,
              },
            ],
          }),
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      const https = require('node:https');
      const constants = require('node:constants');

      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        rejectUnauthorized: false,
        checkServerIdentity: (servername, peer) => {
          console.log("test1: checkServerIdentity");
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      };

      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
      }); // Noncompliant: rejectUnauthorized is false
            `,
      errors: 1,
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');

      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        checkServerIdentity: function() {} // Noncompliant: there is no test cases
      };
      
      var req = https.request(options, (res) => {
        res.on('data', (d) => {});
      }); // Noncompliant
            `,
      errors: [
        {
          line: 14,
          endLine: 14,
          column: 17,
          endColumn: 30,
          message: JSON.stringify({
            message: 'Enable server hostname verification on this SSL/TLS connection.',
            secondaryLocations: [
              {
                column: 20,
                line: 5,
                endColumn: 7,
                endLine: 12,
              },
              {
                column: 8,
                line: 11,
                endColumn: 42,
                endLine: 11,
              },
            ],
          }),
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      const https = require('https');
      const constants = require('constants');

      var options = {
        hostname: 'wrong.host.badssl.com',
        port: 443,
        path: '/',
        method: 'GET',
        secureOptions: constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_TLSv1,
        checkServerIdentity: function() {
          function doSomething() {
            return new Error();
          }
        } // Noncompliant: there is no test cases
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
        url: 'https://wrong.host.badssl.com',
        secureProtocol: 'TLSv1_2_method',
        rejectUnauthorized: true,
        checkServerIdentity: (servername, peer) => {
          console.log("checkServerIdentity");
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      });
            `,
    },
    {
      code: `
      const request = require('request');

      var socket = request.get({
        url: 'https://wrong.host.badssl.com',
        secureProtocol: 'TLSv1_2_method',
        checkServerIdentity: (servername, peer) => {
          console.log("checkServerIdentity");
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      });
            `,
    },
    {
      code: `
      const request = require('request');
      
      var socket = request.get({
        url: 'https://wrong.host.badssl.com',
        secureProtocol: 'TLSv1_2_method'
      });
            `,
    },
    {
      code: `
      const request = require('request');
      request.unknown();
            `,
    },
  ],
  invalid: [
    {
      code: `
      const request = require('request');

      var socket = request.get({
        url: 'https://wrong.host.badssl.com',
        secureProtocol: 'TLSv1_2_method',
        rejectUnauthorized: false,  // Noncompliant
        checkServerIdentity: (servername, peer) => {
          console.log("checkServerIdentity");
          if (servername !== "www.google.com") {
            return new Error ('Error');
          }
        }
      });  // Noncompliant: rejectUnauthorized to true
            `,
      errors: [
        {
          line: 4,
          endLine: 4,
          column: 20,
          endColumn: 31,
          message: JSON.stringify({
            message: 'Enable server hostname verification on this SSL/TLS connection.',
            secondaryLocations: [
              {
                message: 'Set "rejectUnauthorized" to "true".',
                column: 8,
                line: 7,
                endColumn: 33,
                endLine: 7,
              },
            ],
          }),
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      const request = require('request');

      var socket = request.get({
        url: 'https://wrong.host.badssl.com',
        secureProtocol: 'TLSv1_2_method',
        checkServerIdentity: function() {}  // Noncompliant: there is no test cases
      });
            `,
      errors: 1,
    },
    {
      code: `
      const request = require('request');

      var socket = request.get({
        url: 'https://wrong.host.badssl.com',
        secureProtocol: 'TLSv1_2_method',
        checkServerIdentity: function() {
          return true;
        }  // Noncompliant: there is no test cases
      });
            `,
      errors: 1,
    },
  ],
};

const testCasesTls = {
  valid: [
    {
      code: `
      const tls = require('tls');

      var options = {
          checkServerIdentity: (servername, peer) => {
              console.log("checkServerIdentity");
              if (servername !== "www.google.com") {
                  return new Error ('Error');  // Compliant: there is at least one check on the servername argument and rejectUnauthorized: true
              }
          },
          rejectUnauthorized: true
      };

      var socket = tls.connect(443, "www.google.fr", options, () => {
        process.stdin.pipe(socket);
        process.stdin.resume();
      });
            `,
    },
    {
      code: `
      const tls = require('tls');

      var options = {
        checkServerIdentity: (servername, peer) => {
            console.log("checkServerIdentity");
            if (servername !== "www.google.com") {
                return new Error ('Error');  // Compliant: there is at least one check on the servername argument that throw Error and rejectUnauthorized: true
            }
        }
      };

      var socket = tls.connect(443, "www.google.fr", options, () => {
        process.stdin.pipe(socket);
        process.stdin.resume();
      });
            `,
    },
    {
      code: `
      const tls = require('tls');
      tls.unknown();
            `,
    },
  ],
  invalid: [
    {
      code: `
      const tls = require('tls');

      var options = {
        checkServerIdentity: (servername, peer) => {
            console.log("checkServerIdentity");
            if (servername !== "www.google.com") {
                return new Error ('Error');
            }
        },
        rejectUnauthorized: false // Noncompliant
      };

      var socket = tls.connect(443, "www.google.fr", options, () => {
        process.stdin.pipe(socket);
        process.stdin.resume();
      });
            `,
      errors: 1,
    },
    {
      code: `
      const tls = require('node:tls');

      var options = {
        checkServerIdentity: (servername, peer) => {
            console.log("checkServerIdentity");
            if (servername !== "www.google.com") {
                return new Error ('Error');
            }
        },
        rejectUnauthorized: false // Noncompliant
      };

      var socket = tls.connect(443, "www.google.fr", options, () => {
        process.stdin.pipe(socket);
        process.stdin.resume();
      });
            `,
      errors: 1,
    },
    {
      code: `
      const tls = require('tls');

      var options = {
        checkServerIdentity: function() {}  // Noncompliant: there is no test cases
      };
    
      var socket = tls.connect(443, "www.google.fr", options, () => {
        process.stdin.pipe(socket);
        process.stdin.resume();
      });
            `,
      errors: 1,
    },
  ],
};

ruleTesterJs.run(
  '[JS-https] Server hostnames should be verified during SSL/TLS connections',
  rule,
  testCasesHttps,
);

ruleTesterJs.run(
  '[JS-request] Server hostnames should be verified during SSL/TLS connections',
  rule,
  testCasesRequest,
);

ruleTesterJs.run(
  '[JS-tls] Server hostnames should be verified during SSL/TLS connections',
  rule,
  testCasesTls,
);
