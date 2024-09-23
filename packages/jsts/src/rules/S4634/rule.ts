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
// https://sonarsource.github.io/rspec/#/rspec/S4634/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, isFunctionNode } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      promiseAction: 'Replace this trivial promise with "Promise.{{action}}".',
      suggestPromiseAction: 'Replace with "Promise.{{action}}"',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      NewExpression: (node: estree.Node) => {
        const newExpr = node as estree.NewExpression;
        const executor = getPromiseExecutor(newExpr, context);
        if (executor) {
          checkExecutor(newExpr, executor, context);
        }
      },
    };
  },
};

function getPromiseExecutor(node: estree.NewExpression, context: Rule.RuleContext) {
  if (
    node.callee.type === 'Identifier' &&
    context.sourceCode.getText(node.callee) === 'Promise' &&
    node.arguments.length === 1
  ) {
    return node.arguments[0];
  }
  return undefined;
}

function checkExecutor(
  newExpr: estree.NewExpression,
  executor: estree.Node,
  context: Rule.RuleContext,
) {
  if (!isFunctionNode(executor)) {
    return;
  }
  const { params, body } = executor;
  const [resolveParameterDeclaration, rejectParameterDeclaration] = params;

  const resolveParameterName = getParameterName(resolveParameterDeclaration);
  const rejectParameterName = getParameterName(rejectParameterDeclaration);

  const bodyExpression = getOnlyBodyExpression(body);
  if (bodyExpression && bodyExpression.type === 'CallExpression') {
    const { callee, arguments: args } = bodyExpression;
    if (callee.type === 'Identifier') {
      const action = getPromiseAction(callee.name, resolveParameterName, rejectParameterName);
      if (action && args.length === 1) {
        context.report({
          messageId: 'promiseAction',
          data: {
            action,
          },
          node: newExpr.callee,
          suggest: [
            {
              messageId: 'suggestPromiseAction',
              data: {
                action,
              },
              fix: fixer => {
                const argText = context.sourceCode.getText(args[0]);
                return fixer.replaceText(newExpr, `Promise.${action}(${argText})`);
              },
            },
          ],
        });
      }
    }
  }
}

function getOnlyBodyExpression(node: estree.Node) {
  let bodyExpression: estree.Node | undefined;
  if (node.type === 'BlockStatement') {
    if (node.body.length === 1) {
      const statement = node.body[0];
      if (statement.type === 'ExpressionStatement') {
        bodyExpression = statement.expression;
      }
    }
  } else {
    bodyExpression = node;
  }
  return bodyExpression;
}

function getPromiseAction(
  callee: string,
  resolveParameterName: string | undefined,
  rejectParameterName: string | undefined,
) {
  switch (callee) {
    case resolveParameterName:
      return 'resolve';
    case rejectParameterName:
      return 'reject';
    default:
      return undefined;
  }
}

function getParameterName(node: estree.Node | undefined) {
  return node && node.type === 'Identifier' ? node.name : undefined;
}
