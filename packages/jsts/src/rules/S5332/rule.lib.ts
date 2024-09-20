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
// https://sonarsource.github.io/rspec/#/rspec/S5332/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { URL } from 'url';
import { getFullyQualifiedName, getParent, getProperty, getValueOfExpression } from '../helpers';
import { normalizeFQN } from '../helpers/aws/cdk';

const INSECURE_PROTOCOLS = ['http://', 'ftp://', 'telnet://'];
const LOOPBACK_PATTERN = /localhost|127(?:\.\d+){0,2}\.\d+$|\/\/(?:0*:)*?:?0*1$/;
const EXCEPTION_FULL_HOSTS = [
  'www.w3.org',
  'xml.apache.org',
  'schemas.xmlsoap.org',
  'schemas.openxmlformats.org',
  'rdfs.org',
  'purl.org',
  'xmlns.com',
  'schemas.google.com',
  'a9.com',
  'ns.adobe.com',
  'ltsc.ieee.org',
  'docbook.org',
  'graphml.graphdrawing.org',
  'json-schema.org',
  'schemas.microsoft.com',
];
const EXCEPTION_TOP_HOSTS = [
  /\.example$/,
  /\.?example\.com$/,
  /\.?example\.org$/,
  /\.test$/,
  /\.?test\.com$/,
];

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
          if (secure && secure.value.type === 'Literal' && secure.value.raw === 'false') {
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
          firstArg &&
          firstArg.type === 'Literal' &&
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
      if (INSECURE_PROTOCOLS.includes(value)) {
        const parent = getParent(context, node);
        return !(parent?.type === 'BinaryExpression' && parent.operator === '+');
      }
      return hasExceptionHost(value);
    }

    function hasExceptionHost(value: string) {
      let url;

      try {
        url = new URL(value);
      } catch (err) {
        return false;
      }

      const host = url.hostname;
      return (
        host.length === 0 ||
        LOOPBACK_PATTERN.test(host) ||
        EXCEPTION_FULL_HOSTS.some(exception => exception === host) ||
        EXCEPTION_TOP_HOSTS.some(exception => exception.test(host))
      );
    }

    return {
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        if (typeof literal.value === 'string') {
          const value = literal.value.trim().toLocaleLowerCase();
          const insecure = INSECURE_PROTOCOLS.find(protocol => value.startsWith(protocol));
          if (insecure && !isExceptionUrl(value, node)) {
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
  let alternative;
  switch (protocol) {
    case 'http':
      alternative = 'https';
      break;
    case 'ftp':
      alternative = 'sftp, scp or ftps';
      break;
    default:
      alternative = 'ssh';
  }
  return { messageId: 'insecureProtocol', data: { protocol, alternative } };
}
