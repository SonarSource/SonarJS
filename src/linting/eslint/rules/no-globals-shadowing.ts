/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2137/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { globalsByLibraries } from './helpers';

const illegalNames = ['arguments', 'undefined'];

const getDeclarationIssue = (redeclareType: string) => (name: string) => ({
  messageId: 'forbidDeclaration',
  data: { symbol: name, type: redeclareType },
});

const getModificationIssue = (functionName: string) => ({
  messageId: 'removeModification',
  data: { symbol: functionName },
});

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      removeModification: 'Remove the modification of "{{symbol}}".',
      forbidDeclaration: 'Do not use "{{symbol}}" to declare a {{type}} - use another name.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression': function (node: estree.Node) {
        const func = node as estree.FunctionDeclaration | estree.FunctionExpression;
        reportBadUsageOnFunction(func, func.id, context);
      },
      ArrowFunctionExpression: function (node: estree.Node) {
        reportBadUsageOnFunction(node as estree.ArrowFunctionExpression, undefined, context);
      },
      VariableDeclaration(node: estree.Node) {
        (node as estree.VariableDeclaration).declarations.forEach(decl => {
          reportBadUsage(decl.id, getDeclarationIssue('variable'), context);
        });
      },
      UpdateExpression(node: estree.Node) {
        reportBadUsage((node as estree.UpdateExpression).argument, getModificationIssue, context);
      },
      AssignmentExpression(node: estree.Node) {
        reportBadUsage((node as estree.AssignmentExpression).left, getModificationIssue, context);
      },
      CatchClause(node: estree.Node) {
        reportBadUsage(
          (node as estree.CatchClause).param,
          getDeclarationIssue('variable'),
          context,
        );
      },
    };
  },
};

function isBuiltIn(name: string) {
  return globalsByLibraries.builtin.includes(name);
}

function reportBadUsageOnFunction(
  func: estree.Function,
  id: estree.Node | null | undefined,
  context: Rule.RuleContext,
) {
  reportBadUsage(id, getDeclarationIssue('function'), context);
  func.params.forEach(p => {
    reportBadUsage(p, getDeclarationIssue('parameter'), context);
  });
}

function reportBadUsage(
  node: estree.Node | null | undefined,
  buildMessageAndData: (name: string) => { messageId: string; data: any },
  context: Rule.RuleContext,
) {
  if (node) {
    switch (node.type) {
      case 'Identifier': {
        if (illegalNames.includes(node.name) || isBuiltIn(node.name)) {
          context.report({
            node: node,
            ...buildMessageAndData(node.name),
          });
        }
        break;
      }
      case 'RestElement':
        reportBadUsage(node.argument, buildMessageAndData, context);
        break;
      case 'ObjectPattern':
        node.properties.forEach(prop => {
          if (prop.type === 'Property') {
            reportBadUsage(prop.value, buildMessageAndData, context);
          } else {
            reportBadUsage(prop.argument, buildMessageAndData, context);
          }
        });
        break;
      case 'ArrayPattern':
        node.elements.forEach(elem => {
          reportBadUsage(elem, buildMessageAndData, context);
        });
        break;
      case 'AssignmentPattern':
        reportBadUsage(node.left, buildMessageAndData, context);
        break;
    }
  }
}
