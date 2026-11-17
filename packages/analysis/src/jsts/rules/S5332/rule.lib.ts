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
import { getFullyQualifiedName } from '../helpers/module.js';
import { getParent } from '../helpers/ancestor.js';
import { getProperty, getValueOfExpression } from '../helpers/ast.js';
import { normalizeFQN } from '../helpers/aws/cdk.js';
import {
  CLEARTEXT_PROTOCOLS,
  isSafeWithoutTls,
  stripJavaWhitespace,
} from './cleartext-protocol-exclusions.js';

// Message recommendations stay local; Commons supplies the recognized protocols and exclusions.
const CLEARTEXT_PROTOCOL_ALTERNATIVES: Record<string, string> = {
  http: 'https',
  ftp: 'sftp, scp or ftps',
  ws: 'wss',
  telnet: 'ssh',
  gopher: 'https',
  tftp: 'sftp',
  smtp: 'smtps',
  ldap: 'ldaps',
  imap: 'imaps',
  pop3: 'pop3s',
  amqp: 'amqps',
  mqtt: 'mqtts',
  sip: 'sips',
  rtmp: 'rtmps',
  irc: 'ircs',
  nntp: 'nntps',
  stomp: 'stomps',
};

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

    function isExceptionUrl(value: string, node: estree.Node) {
      if (CLEARTEXT_PROTOCOLS.includes(stripJavaWhitespace(value).toLowerCase())) {
        const parent = getParent(context, node);
        return !(parent?.type === 'BinaryExpression' && parent.operator === '+');
      }
      return isSafeWithoutTls(value);
    }

    return {
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        if (typeof literal.value === 'string') {
          const value = stripJavaWhitespace(literal.value).toLowerCase();
          const insecure = CLEARTEXT_PROTOCOLS.find(protocol => value.startsWith(protocol));
          if (insecure && !isExceptionUrl(literal.value, node)) {
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
  return {
    messageId: 'insecureProtocol',
    data: { protocol, alternative: CLEARTEXT_PROTOCOL_ALTERNATIVES[protocol] },
  };
}
