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
// https://sonarsource.github.io/rspec/#/rspec/S1121/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, getParent } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      extractAssignment: 'Extract the assignment of "{{symbol}}" from this expression.',
    },
  }),
  create(context: Rule.RuleContext) {
    function isAssignmentStatement(parent: estree.Node) {
      return parent.type === 'ExpressionStatement';
    }

    function isEnclosingChain(parent: estree.Node) {
      return parent.type === 'AssignmentExpression';
    }

    function isEnclosingRelation(parent: estree.Node) {
      return (
        parent.type === 'BinaryExpression' &&
        ['==', '!=', '===', '!==', '<', '<=', '>', '>='].includes(parent.operator)
      );
    }

    function isEnclosingSequence(parent: estree.Node) {
      return parent.type === 'SequenceExpression';
    }

    function isEnclosingDeclarator(parent: estree.Node) {
      return parent.type === 'VariableDeclarator';
    }

    function isLambdaBody(parent: estree.Node, expr: estree.AssignmentExpression) {
      return parent.type === 'ArrowFunctionExpression' && parent.body === expr;
    }

    function isConditionalAssignment(parent: estree.Node, expr: estree.AssignmentExpression) {
      return parent.type === 'LogicalExpression' && parent.right === expr;
    }

    function isWhileCondition(parent: estree.Node, expr: estree.AssignmentExpression) {
      return (
        (parent.type === 'DoWhileStatement' || parent.type === 'WhileStatement') &&
        parent.test === expr
      );
    }

    function isForInitOrUpdate(parent: estree.Node, expr: estree.AssignmentExpression) {
      return parent.type === 'ForStatement' && (parent.init === expr || parent.update === expr);
    }

    return {
      AssignmentExpression: (node: estree.Node) => {
        const assignment = node as estree.AssignmentExpression;
        const parent = getParent(context, node);
        if (
          parent &&
          !isAssignmentStatement(parent) &&
          !isEnclosingChain(parent) &&
          !isEnclosingRelation(parent) &&
          !isEnclosingSequence(parent) &&
          !isEnclosingDeclarator(parent) &&
          !isLambdaBody(parent, assignment) &&
          !isConditionalAssignment(parent, assignment) &&
          !isWhileCondition(parent, assignment) &&
          !isForInitOrUpdate(parent, assignment)
        ) {
          raiseIssue(assignment, context);
        }
      },
    };
  },
};

function raiseIssue(node: estree.AssignmentExpression, context: Rule.RuleContext) {
  const sourceCode = context.sourceCode;
  const operator = sourceCode.getFirstTokenBetween(
    node.left,
    node.right,
    token => token.value === node.operator,
  );
  const text = sourceCode.getText(node.left);
  context.report({
    messageId: 'extractAssignment',
    data: {
      symbol: text,
    },
    loc: operator!.loc,
  });
}
