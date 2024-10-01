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

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Using clear-text protocols is security-sensitive', rule, {
  valid: [
    {
      code: `
      // Non sensitive url scheme
      url = "https://";
      url = "sftp://";
      url = "ftps://";
      url = "scp://";
      url = "ssh://";

      // We only report string staring with the sensitive url scheme.
      doc = "See http://exemple.com";
      doc = "See ftp://exemple.com";
      doc = "See telnet://exemple.com";

      // Exception: The url domain component is a loopback address.
      url = "http://localhost";
      url = "http://127.0.0.1";
      url = "ftp://user@localhost";
      `,
    },
    {
      code: `
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport({
        secure: true,
      });
      `,
    },
    {
      code: `
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport();
      `,
    },
    {
      code: `
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport({
        requireTLS: true,
      });
      `,
    },
    {
      code: `
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport({
        port: 465, // Compliant (port 465 enables encryption automatically)
      });
      `,
    },
    {
      code: `
      var Client = require('ftp');
      var c = new Client();
      c.connect({
        'secure': true
      });
      `,
    },
    {
      code: `
      var Client = require('ftp');
      var c = new Client();
      c.connect();
      `,
    },
    {
      code: `
      require('some-module');
      require();
      import estree from 'estree';
      `,
    },
    {
      code: `
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport({ // OK
        secure: false,
        requireTLS: someGlobalVar,
        port: 1234
      });
      `,
    },
    {
      code: `
      url = "http://";
      url = "ftp://";
      url = "telnet://";
      `,
    },
    {
      code: `
      url = "http://example.example";
      url = "http://subdomain.example.example";
      url = "http://example.com";
      url = "http://someSubdomain.example.com";
      url = "http://example.org";
      url = "http://someSubdomain.example.org";
      url = "http://example.test";
      url = "http://subdomain.example.test";
      url = "http://test.com";
      url = "http://someSubdomain.test.com";
      `,
    },
    {
      code: `
      url = "http://xmlns.com";
      `,
    },
    {
      code: `
      url = 'http://'.replace('', foo);
      url = 'http://'.replace('', foo) + bar;
      `,
    },
    {
      code: `
      import ses from '@aws-sdk/client-ses';
      import nodemailer from 'nodemailer';

      const sesClient = new ses.SES({ region: AWS_REGION });
      const transporter = nodemailer.createTransport({
        SES: {
          ses: sesClient,
          aws: ses,
        },
      });`,
    },
    {
      code: `
        url = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups';
        url = 'http://schemas.microsoft.com/identity/claims/displayname';
        url = 'http://schemas.microsoft.com';
      `,
    },
  ],
  invalid: [
    {
      code: `
      url = "http://192.168.0.1";
      url = "http://10.1.1.123";
      url = "http://subdomain.exemple.com";
      url = "ftp://anonymous@exemple.com";
      url = "telnet://anonymous@exemple.com";
      `,
      errors: 5,
    },
    {
      code: `
      var Client = require('ftp');
      var c = new Client();
      c.connect({
        'secure': false
      });
      `,
      errors: [
        {
          message: 'Using ftp protocol is insecure. Use sftp, scp or ftps instead.',
          line: 4,
          endLine: 4,
          column: 7,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
      const nodemailer = require("nodemailer");

      let transporter = nodemailer.createTransport({
        secure: false,
        requireTLS: false,
        port: 1234
      });
      `,
      errors: 1,
    },
    {
      code: `
      require('telnet-client');
      import telnet from 'telnet-client';
      `,
      errors: 2,
    },
    {
      code: `
      url = "http://someUrl.com?url=test.com";
      `,
      errors: 1,
    },
    {
      code: `
      url = "http://someSubdomain.xmlns.com";
      url = "http://someUrl.com?url=xmlns.com";
      `,
      errors: 2,
    },
    {
      code: `
      url = 'http://' + something;
      `,
      errors: 1,
    },
    {
      code: `
      url = "http://0001::1";
      url = "http://dead:beef::1";
      url = "http://::dead:beef:1";
      `,
      errors: 3,
    },
    {
      code: `
      url = "http://::1"; // FP - url from Node.js is not able to parse IPV6 loopback address
      `,
      errors: 1,
    },
    {
      code: `
      import ses from '@aws-sdk/client-ses';
      import fakeSes from 'fake-client-ses';
      import nodemailer from 'nodemailer';

      const sesClient = new ses.SES({ region: AWS_REGION });
      const fakeSesClient = new fakeSes.SES({ region: AWS_REGION });

      nodemailer.createTransport({
        SES: undefined,
      });

      nodemailer.createTransport({
        SES: {
          ses: sesClient,
        },
      });
      
      nodemailer.createTransport({
        SES: {
          ses: fakeSesClient,
        },
      });

      nodemailer.createTransport({
        SES: {
          aws: ses,
        },
      });

      nodemailer.createTransport({
        SES: {
          aws: fakeSes,
        },
      });

      nodemailer.createTransport({
        SES: {
          ses: undefined,
          aws: ses,
        },
      });

      nodemailer.createTransport({
        SES: {
          ses: sesClient,
          aws: undefined,
        },
      });
      `,
      errors: 7,
    },
  ],
});
