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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S5332', () => {
  it('S5332', () => {
    const ruleTester = new DefaultParserRuleTester();
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
      url = "wss://";
      url = "ircs://";
      url = "smtps://";
      url = "ldaps://";

      // We only report strings starting with the sensitive url scheme.
      doc = "See http://exemple.com";
      doc = "See ftp://exemple.com";
      doc = "See telnet://exemple.com";
      doc = "See ws://exemple.com";
      doc = "See mqtt://exemple.com";

      // New cleartext protocols — safe because of internal/documentation host
      url = "ws://localhost";
      url = "ws://example.com";
      url = "irc://localhost/channel";
      url = "smtp://localhost:25";
      url = "smtp://mail.example.com";
      url = "ldap://localhost/dc=example,dc=com";
      url = "amqp://localhost/vhost";
      url = "amqp://example.com/queue";
      url = "mqtt://localhost:1883";
      url = "mqtt://broker.example.com";
      url = "imap://localhost:143";
      url = "pop3://localhost:110";
      url = "sip://localhost";
      url = "stomp://localhost:61613";
      url = "rtmp://example.com/live";
      url = "gopher://example.com";
      url = "tftp://example.com/file";
      url = "nntp://news.example.com";

      // Loopback — including abbreviated IPv4 forms valid on POSIX systems (APPSEC-3388)
      url = "http://localhost";
      url = "http://127.0.0.1";
      url = "http://127.255.255.254/path";
      url = "http://127.1";
      url = "http://127.0.1";
      url = "http://[::1]/path";
      url = "ftp://user@localhost";

      // Cloud IMDS — link-local range (169.254.0.0/16) and named endpoints
      url = "http://169.254.169.254/latest/meta-data/";
      url = "http://[fd00:ec2::254]/latest/meta-data/";
      url = "http://168.63.129.16/";
      url = "http://100.100.100.200/latest/meta-data/";
      url = "http://metadata.google.internal/computeMetadata/v1";
      url = "http://metadata.internal/";

      // Docker internal hostnames
      url = "http://host.docker.internal:8085/metrics";
      url = "http://gateway.docker.internal";

      // Kubernetes cluster-internal DNS
      url = "http://vault.vault.svc.cluster.local:8200";
      url = "http://auth-service.prod.svc.cluster.local:3001/auth";

      // Template placeholders — lenient fallback prevents false positives
      url = "http://localhost:\${port}/api";
      url = "http://user:\${password}@localhost";
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
      // Protocol appearing mid-string is not flagged — rule only triggers when the string starts with the protocol
      doc = "Make sure to use https instead of http://";
      doc = "some text that mentions http://";
      `,
        },
        {
          code: `
      // IANA-reserved documentation / placeholder domains
      url = "http://example.example";
      url = "http://subdomain.example.example";
      url = "http://example.com";
      url = "http://someSubdomain.example.com";
      url = "http://example.net";
      url = "http://example.org";
      url = "http://someSubdomain.example.org";
      url = "http://example.test";
      url = "http://subdomain.example.test";
      url = "http://myservice.example";
      url = "http://myapi.test";
      url = "http://db.myapi.test:5432";
      url = "http://myapp.localhost";
      `,
        },
        {
          code: `
      url = "http://xmlns.com";
      `,
        },
        {
          code: `
      import * as ses from '@aws-sdk/client-ses';
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
        // Namespace URI authorities — existing entries
        url = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups';
        url = 'http://schemas.microsoft.com/identity/claims/displayname';
        url = 'http://schemas.microsoft.com';
        url = 'http://www.w3.org/2001/XMLSchema';
        url = 'http://schemas.xmlsoap.org/soap/envelope/';

        // Namespace URI authorities — added from CleartextProtocolFilter
        url = 'http://schemas.android.com/apk/res/android';
        url = 'http://hl7.org/fhir';
        url = 'http://schema.org/Person';
        url = 'http://www.springframework.org/schema/beans';
        url = 'http://maven.apache.org/POM/4.0.0';
        url = 'http://ogp.me/ns#';
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
      // New cleartext protocols — public hosts must be flagged
      url = "ws://acme.com";
      url = "rtmp://acme.com/live";
      url = "tftp://acme.com/file";
      url = "gopher://acme.com";
      url = "irc://acme.com/channel";
      url = "smtp://mail.acme.com";
      url = "ldap://acme.com/dc=acme,dc=com";
      url = "amqp://acme.com/vhost";
      url = "mqtt://broker.acme.com";
      url = "imap://mail.acme.com";
      url = "pop3://mail.acme.com";
      url = "nntp://news.acme.com";
      url = "sip://acme.com";
      url = "stomp://acme.com";
      `,
          errors: 14,
        },
        {
          code: `
      url = "ws://acme.com"; // Using ws protocol is insecure. Use wss instead.
      `,
          errors: [{ message: 'Using ws protocol is insecure. Use wss instead.' }],
        },
        {
          code: `
      url = "smtp://mail.acme.com"; // Using smtp protocol is insecure. Use smtps instead.
      `,
          errors: [{ message: 'Using smtp protocol is insecure. Use smtps instead.' }],
        },
        {
          code: `
      url = "mqtt://broker.acme.com"; // Using mqtt protocol is insecure. Use mqtts instead.
      `,
          errors: [{ message: 'Using mqtt protocol is insecure. Use mqtts instead.' }],
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
        {
          code: `
      url = "http://someUrl.com?url=test.com";
      `,
          errors: 1,
        },
        {
          code: `
      // test.com is a real public domain, not a reserved TLD
      url = "http://test.com";
      url = "http://someSubdomain.test.com";
      `,
          errors: 2,
        },
        {
          code: `
      // Safe-host-as-prefix attacks must not be allowed through
      url = "http://localhost.evil.com";
      url = "http://127.0.0.1.evil.com";
      url = "http://169.254.169.254.evil.com";
      url = "http://metadata.google.internal.evil.com";
      url = "http://www.w3.org.evil.com/x";
      url = "http://schema.org.evil.com/Person";
      `,
          errors: 6,
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
      // Bare cleartext protocol scheme is flagged regardless of concatenation context
      url = "http://";
      url = "ftp://";
      url = "ws://";
      url = "mqtt://";
      `,
          errors: 4,
        },
        {
          code: `
      url = 'http://'.replace('', foo);
      url = 'http://'.replace('', foo) + bar;
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
      url = "http://::1"; // Noncompliant — malformed IPv6 URL (brackets required: http://[::1])
      `,
          errors: 1,
        },
        {
          code: `
      import * as ses from '@aws-sdk/client-ses';
      import * as fakeSes from 'fake-client-ses';
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
  });
});
