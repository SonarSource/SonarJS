/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { getModuleNameOfIdentifier, getModuleNameOfImportedIdentifier } from './helpers';

const NET_MODULE = 'net';

const SOCKET_CREATION_FUNCTIONS = new Set(['createConnection', 'connect']);

const SOCKET_CONSTRUCTOR = 'Socket';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      safeSocket: 'Make sure that sockets are used safely here.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.NewExpression, context),
      CallExpression: (node: estree.Node) =>
        checkCallExpression(node as estree.CallExpression, context),
    };
  },
};

function checkCallExpression({ callee, type }: estree.CallExpression, context: Rule.RuleContext) {
  let moduleName;
  let expression: estree.Expression | estree.PrivateIdentifier | undefined;
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    moduleName = getModuleNameOfIdentifier(context, callee.object);
    expression = callee.property;
  }

  if (callee.type === 'Identifier') {
    moduleName = getModuleNameOfImportedIdentifier(context, callee);
    expression = callee;
  }

  if (expression && isQuestionable(expression, type === 'NewExpression', moduleName)) {
    context.report({ messageId: 'safeSocket', node: callee });
  }
}

function isQuestionable(
  expression: estree.Expression | estree.PrivateIdentifier,
  isConstructor: boolean,
  moduleName?: estree.Literal,
) {
  if (!moduleName || moduleName.value !== NET_MODULE || expression.type !== 'Identifier') {
    return false;
  }

  if (isConstructor) {
    return expression.name === SOCKET_CONSTRUCTOR;
  }

  return SOCKET_CREATION_FUNCTIONS.has(expression.name);
}
