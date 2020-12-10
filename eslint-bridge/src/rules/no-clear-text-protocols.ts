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
// https://jira.sonarsource.com/browse/RSPEC-5332

import { Rule } from 'eslint';
import * as estree from 'estree';
import { URL } from 'url';
import {
  getModuleNameOfNode,
  getObjectExpressionProperty,
  getValueOfExpression,
  isCallToFQN,
} from './utils';

const INSECURE_PROTOCOLS = ['http', 'ftp', 'telnet'];
const LOOPBACK_PATTERN = /localhost|127(?:\.[0-9]+){0,2}\.[0-9]+$|\/\/(?:0*\:)*?:?0*1$/;
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function checkNodemailer(callExpression: estree.CallExpression) {
      const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
      if (!firstArg) {
        return;
      }
      const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');
      const secure = getObjectExpressionProperty(firstArgValue, 'secure');
      const requireTls = getObjectExpressionProperty(firstArgValue, 'requireTLS');
      const port = getObjectExpressionProperty(firstArgValue, 'port');
      if (secure && (secure.value.type !== 'Literal' || secure.value.raw !== 'false')) {
        return;
      }
      if (requireTls && (requireTls.value.type !== 'Literal' || requireTls.value.raw !== 'false')) {
        return;
      }
      if (port && (port.value.type !== 'Literal' || port.value.raw === '465')) {
        return;
      }
      context.report({ node: callExpression.callee, message: getMessage('http') });
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
        if (
          !!newExpression &&
          getModuleNameOfNode(context, newExpression.callee)?.value === 'ftp'
        ) {
          const firstArg = callExpression.arguments.length > 0 ? callExpression.arguments[0] : null;
          if (!firstArg) {
            return;
          }
          const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');
          const secure = getObjectExpressionProperty(firstArgValue, 'secure');
          if (secure && secure.value.type === 'Literal' && secure.value.raw === 'false') {
            context.report({
              node: callExpression.callee,
              message: getMessage('ftp'),
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
            message: getMessage('telnet'),
          });
        }
      }
    }

    return {
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        const value = literal.value;
        if (typeof value === 'string' && !value.match(LOOPBACK_PATTERN)) {
          try {
            const parsedUrl = new URL(value);
            const insecure = INSECURE_PROTOCOLS.find(i => `${i}:` === parsedUrl.protocol);
            if (insecure && parsedUrl.hostname.length !== 0) {
              context.report({
                node: literal,
                message: getMessage(insecure),
              });
            }
          } catch (err) {}
        }
      },
      CallExpression: (node: estree.Node) => {
        const callExpression = node as estree.CallExpression;
        if (isCallToFQN(context, callExpression, 'nodemailer', 'createTransport')) {
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
            message: getMessage('telnet'),
          });
        }
      },
    };
  },
};

function getMessage(protocol: string) {
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
  return `Using ${protocol} protocol is insecure. Use ${alternative} instead.`;
}
