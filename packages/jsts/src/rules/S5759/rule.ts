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
// https://sonarsource.github.io/rspec/#/rspec/S5759/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getValueOfExpression,
  toEncodedMessage,
  getFullyQualifiedName,
  getProperty,
} from '../helpers';
import { SONAR_RUNTIME } from '../parameters';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        const { callee, arguments: args } = call;
        if (isSensitiveFQN(context, call) && args.length > 0) {
          const xfwdProp = getProperty(args[0], 'xfwd', context);
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
  const fqn = getFullyQualifiedName(context, call);
  return (
    fqn &&
    ['http-proxy.createProxyServer', 'http-proxy-middleware.createProxyMiddleware'].includes(fqn)
  );
}
