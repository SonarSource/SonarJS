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
// https://jira.sonarsource.com/browse/RSPEC-5759

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getModuleNameOfNode,
  getObjectExpressionProperty,
  getValueOfExpression,
  isCallToFQN,
  isIdentifier,
  toEncodedMessage,
} from './utils';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;
        if (isSensitiveFQN(context, call) && args.length > 0) {
          const xfwdProp = getObjectExpressionProperty(args[0], 'xfwd');
          if (!xfwdProp) {
            return;
          }
          const xfwdValue = getValueOfExpression(context, xfwdProp.value, 'Literal');
          if (xfwdValue?.value === true) {
            context.report({
              node: callee,
              message: toEncodedMessage('Make sure forwarding client IP address is safe here.', [
                xfwdProp,
              ]),
            });
          }
        }
      },
    };
  },
};

function isSensitiveFQN(context: Rule.RuleContext, call: estree.CallExpression) {
  const { callee } = call;
  if (callee.type === 'MemberExpression') {
    return (
      isCallToFQN(context, call, 'http-proxy', 'createProxyServer') ||
      isCallToFQN(context, call, 'http-proxy-middleware', 'createProxyMiddleware')
    );
  }
  return (
    (isIdentifier(callee, 'createProxyServer') &&
      getModuleNameOfNode(context, callee)?.value === 'http-proxy') ||
    (isIdentifier(callee, 'createProxyMiddleware') &&
      getModuleNameOfNode(context, callee)?.value === 'http-proxy-middleware')
  );
}
