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
// https://sonarsource.github.io/rspec/#/rspec/S5332/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { URL } from 'node:url';
import { getFullyQualifiedName } from '../helpers/module.js';
import { getProperty, getValueOfExpression } from '../helpers/ast.js';
import { normalizeFQN } from '../helpers/aws/cdk.js';

// Mirrors CleartextProtocolFilter.CLEARTEXT_SCHEMES from sonar-analyzer-commons
const INSECURE_PROTOCOLS = [
  'http://',
  'ftp://',
  'ws://',
  'telnet://',
  'rtmp://',
  'tftp://',
  'gopher://',
  'irc://',
  'smtp://',
  'ldap://',
  'amqp://',
  'mqtt://',
  'imap://',
  'pop3://',
  'nntp://',
  'sip://',
  'stomp://',
];

// Internal / non-public hosts — port of CleartextProtocolFilter.SAFE_HOSTS from sonar-analyzer-commons
// Note: ^127(?:\.\d+){1,3} covers abbreviated loopback forms (127.1, 127.0.1) that are valid on POSIX systems
const SAFE_HOSTS =
  /(?:^localhost|^127(?:\.\d+){1,3}|^\[(?:0*:){7}:?0*1]|^\[::1]|^169\.254\.\d+\.\d+|^\[fd00:ec2::254]|^168\.63\.129\.16|^100\.100\.100\.200|^metadata\.google\.internal|^metadata\.internal|^host\.docker\.internal|^gateway\.docker\.internal|\.svc\.cluster\.local)(?=:|$)/i;

// XML namespace URI authorities — port of CleartextProtocolFilter.NAMESPACE_URI_AUTHORITIES, extended with pre-existing sonar-js exceptions
const NAMESPACE_URI_AUTHORITIES =
  /(?:^www\.w3\.org|^schemas\.android\.com|^schemas\.microsoft\.com|^schemas\.xmlsoap\.org|^www\.sap\.com|^www\.opengis\.net|^hl7\.org|^unitsofmeasure\.org|^purl\.org|^docs\.oasis-open\.org|^xmlns\.com|^json-ld\.org|^schema\.org|^www\.springframework\.org|^maven\.apache\.org|^dublincore\.org|^ogp\.me|^xml\.apache\.org|^schemas\.openxmlformats\.org|^rdfs\.org|^schemas\.google\.com|^a9\.com|^ns\.adobe\.com|^ltsc\.ieee\.org|^docbook\.org|^graphml\.graphdrawing\.org|^json-schema\.org)(?=:|$)/i;

// IANA-reserved documentation / placeholder domains — port of CleartextProtocolFilter.DOCUMENTATION_HOSTS
const DOCUMENTATION_HOSTS =
  /(?:(?:^|\.)example\.(?:com|net|org)|\.(?:example|test|localhost))(?=:|$)/i;

// Lenient authority extractor for URLs that fail strict URL parsing (e.g. template placeholders, underscores in hostnames)
const LENIENT_AUTHORITY =
  /^(?:http|ftp|ws|telnet|rtmp|tftp|gopher|irc|smtp|ldap|amqp|mqtt|imap|pop3|nntp|sip|stomp):\/\/(?:[^@\s/?#]+@)?([^\s/?#]+)/i;

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      insecureProtocol: 'Using {{protocol}} protocol is insecure. Use {{alternative}} instead.',
    },
  },
  create(context: Rule.RuleContext) {
    function checkNodemailer(callExpression: estree.CallExpression) {
      const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
      if (!firstArg) {
        return;
      }

      const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');

      const ses = getProperty(firstArgValue, 'SES', context);
      if (ses && usesSesCommunication(ses)) {
        return;
      }

      const secure = getProperty(firstArgValue, 'secure', context);
      if (secure && (secure.value.type !== 'Literal' || secure.value.raw !== 'false')) {
        return;
      }

      const requireTls = getProperty(firstArgValue, 'requireTLS', context);
      if (requireTls && (requireTls.value.type !== 'Literal' || requireTls.value.raw !== 'false')) {
        return;
      }

      const port = getProperty(firstArgValue, 'port', context);
      if (port && (port.value.type !== 'Literal' || port.value.raw === '465')) {
        return;
      }

      context.report({ node: callExpression.callee, ...getMessageAndData('http') });
    }

    function usesSesCommunication(sesProperty: estree.Property) {
      const configuration = getValueOfExpression(context, sesProperty.value, 'ObjectExpression');
      if (!configuration) {
        return false;
      }

      const ses = getValueOfExpression(
        context,
        getProperty(configuration, 'ses', context)?.value,
        'NewExpression',
      );
      if (!ses || normalizeFQN(getFullyQualifiedName(context, ses)) !== '@aws_sdk.client_ses.SES') {
        return false;
      }

      const aws = getProperty(configuration, 'aws', context);
      if (
        !aws ||
        normalizeFQN(getFullyQualifiedName(context, aws.value)) !== '@aws_sdk.client_ses'
      ) {
        return false;
      }

      return true;
    }

    function checkCallToFtp(callExpression: estree.CallExpression) {
      if (
        callExpression.callee.type === 'MemberExpression' &&
        callExpression.callee.property.type === 'Identifier' &&
        callExpression.callee.property.name === 'connect'
      ) {
        const newExpression = getValueOfExpression(
          context,
          callExpression.callee.object,
          'NewExpression',
        );
        if (!!newExpression && getFullyQualifiedName(context, newExpression.callee) === 'ftp') {
          const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
          if (!firstArg) {
            return;
          }
          const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');
          const secure = getProperty(firstArgValue, 'secure', context);
          if (secure?.value.type === 'Literal' && secure.value.raw === 'false') {
            context.report({
              node: callExpression.callee,
              ...getMessageAndData('ftp'),
            });
          }
        }
      }
    }

    function checkCallToRequire(callExpression: estree.CallExpression) {
      if (callExpression.callee.type === 'Identifier' && callExpression.callee.name === 'require') {
        const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
        if (
          firstArg?.type === 'Literal' &&
          typeof firstArg.value === 'string' &&
          firstArg.value === 'telnet-client'
        ) {
          context.report({
            node: firstArg,
            ...getMessageAndData('telnet'),
          });
        }
      }
    }

    return {
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        if (typeof literal.value === 'string') {
          const value = literal.value.trim().toLocaleLowerCase();
          const insecure = INSECURE_PROTOCOLS.find(protocol => value.startsWith(protocol));
          if (insecure && !hasExceptionHost(value)) {
            const protocol = insecure.substring(0, insecure.indexOf(':'));
            context.report({
              ...getMessageAndData(protocol),
              node,
            });
          }
        }
      },
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (getFullyQualifiedName(context, callExpression) === 'nodemailer.createTransport') {
          checkNodemailer(callExpression);
        }
        checkCallToFtp(callExpression);
        checkCallToRequire(callExpression);
      },
      ImportDeclaration: (node: estree.Node) => {
        const importDeclaration = node as estree.ImportDeclaration;
        if (
          typeof importDeclaration.source.value === 'string' &&
          importDeclaration.source.value === 'telnet-client'
        ) {
          context.report({
            node: importDeclaration.source,
            ...getMessageAndData('telnet'),
          });
        }
      },
    };
  },
};

function getMessageAndData(protocol: string) {
  const alternatives: Record<string, string> = {
    http: 'https',
    ftp: 'sftp, scp or ftps',
    ws: 'wss',
    telnet: 'ssh',
    rtmp: 'rtmps',
    tftp: 'sftp',
    gopher: 'https',
    irc: 'ircs',
    smtp: 'smtps',
    ldap: 'ldaps',
    amqp: 'amqps',
    mqtt: 'mqtts',
    imap: 'imaps',
    pop3: 'pop3s',
    nntp: 'nntps',
    sip: 'sips',
    stomp: 'stomps',
  };
  return { messageId: 'insecureProtocol', data: { protocol, alternative: alternatives[protocol] } };
}

function hasExceptionHost(value: string) {
  let host: string;

  try {
    const url = new URL(value);
    host = url.hostname;
    if (host.length === 0) {
      return false;
    }
  } catch {
    // Lenient fallback for template placeholders (e.g. http://localhost:${port}) and underscores in hostnames.
    // Mirrors CleartextProtocolFilter's authority-extraction logic.
    const match = LENIENT_AUTHORITY.exec(value);
    if (!match) {
      return false;
    }
    host = match[1];
  }

  return isSafeHost(host);
}

function isSafeHost(host: string) {
  return (
    SAFE_HOSTS.test(host) || NAMESPACE_URI_AUTHORITIES.test(host) || DOCUMENTATION_HOSTS.test(host)
  );
}
