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
// https://sonarsource.github.io/rspec/#/rspec/S4818/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getFullyQualifiedName } from '../helpers';
import { generateMeta } from '../helpers';
import rspecMeta from './meta.json';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      safeSocket: 'Make sure that sockets are used safely here.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.NewExpression, context, 'net.Socket'),
      CallExpression: (node: estree.Node) =>
        checkCallExpression(
          node as estree.CallExpression,
          context,
          'net.createConnection',
          'net.connect',
        ),
    };
  },
};

function checkCallExpression(
  callExpr: estree.CallExpression,
  context: Rule.RuleContext,
  ...sensitiveFqns: string[]
) {
  const callFqn = getFullyQualifiedName(context, callExpr);
  if (sensitiveFqns.some(sensitiveFqn => sensitiveFqn === callFqn)) {
    context.report({ messageId: 'safeSocket', node: callExpr.callee });
  }
}
