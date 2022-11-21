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
// https://sonarsource.github.io/rspec/#/rspec/S1848/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getFullyQualifiedName, isTestCode } from './helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      removeInstantiationOf:
        'Either remove this useless object instantiation of "{{constructor}}" or use it.',
      removeInstantiation: 'Either remove this useless object instantiation or use it.',
    },
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.getSourceCode();
    return {
      'ExpressionStatement > NewExpression': (node: estree.NewExpression) => {
        if (isTestCode(context) || isTryable(node, context)) {
          return;
        }
        const callee = (node as estree.NewExpression).callee;
        if (callee.type === 'Identifier' || callee.type === 'MemberExpression') {
          const calleeText = sourceCode.getText(callee);
          if (isException(context, callee, calleeText)) {
            return;
          }
          const reportLocation = {
            start: node.loc!.start,
            end: callee.loc!.end,
          };
          reportIssue(reportLocation, `${calleeText}`, 'removeInstantiationOf', context);
        } else {
          const newToken = sourceCode.getFirstToken(node);
          reportIssue(newToken!.loc, '', 'removeInstantiation', context);
        }
      },
    };
  },
};

function isTryable(node: estree.Node, context: Rule.RuleContext) {
  const ancestors = context.getAncestors();
  let parent = undefined;
  let child = node;
  while ((parent = ancestors.pop()) !== undefined) {
    if (parent.type === 'TryStatement' && parent.block === child) {
      return true;
    }
    child = parent;
  }
  return false;
}

function reportIssue(
  loc: { start: estree.Position; end: estree.Position },
  objectText: string,
  messageId: string,
  context: Rule.RuleContext,
) {
  context.report({
    messageId,
    data: {
      constructor: objectText,
    },
    loc,
  });
}

/**
 * These exceptions are based on community requests and Peach
 */
function isException(
  context: Rule.RuleContext,
  node: estree.Identifier | estree.MemberExpression,
  name: string,
) {
  if (name === 'Notification') {
    return true;
  }

  const fqn = getFullyQualifiedName(context, node);
  return fqn === 'vue' || fqn === '@ag-grid-community.core.Grid';
}
