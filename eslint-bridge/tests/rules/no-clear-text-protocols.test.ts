/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { rule } from 'rules/no-clear-text-protocols';

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
      url = "http://::1";
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
      import * as estree from 'estree';
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
      url = "http://0001::1";
      url = "http://dead:beef::1";
      url = "http://::dead:beef:1";
      url = "ftp://";
      url = "telnet://";
      `,
    },
  ],
  invalid: [
    {
      code: `
      url = "http://exemple.com";
      `,
      errors: [
        {
          message: 'Using http protocol is insecure. Use https instead.',
          line: 2,
          endLine: 2,
          column: 13,
          endColumn: 33,
        },
      ],
    },
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
      import * as telnet from 'telnet-client';
      `,
      errors: 2,
    },
  ],
});
