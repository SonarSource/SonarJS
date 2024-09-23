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
// https://sonarsource.github.io/rspec/#/rspec/S3699

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isArrowFunctionExpression,
  isFunctionExpression,
  RuleContext,
} from '../helpers/index.js';
import { Rule } from 'eslint';
import estree from 'estree';
import { meta } from './meta.js';

const EMPTY_RETURN_VALUE_KEYWORDS = new Set([
  'TSVoidKeyword',
  'TSNeverKeyword',
  'TSUndefinedKeyword',
]);

function isReturnValueUsed(callExpr: TSESTree.Node) {
  const { parent } = callExpr;
  if (!parent) {
    return false;
  }

  if (parent.type === 'LogicalExpression') {
    return parent.left === callExpr;
  }

  if (parent.type === 'SequenceExpression') {
    return parent.expressions[parent.expressions.length - 1] === callExpr;
  }

  if (parent.type === 'ConditionalExpression') {
    return parent.test === callExpr;
  }

  return (
    parent.type !== 'ExpressionStatement' &&
    parent.type !== 'ArrowFunctionExpression' &&
    parent.type !== 'UnaryExpression' &&
    parent.type !== 'AwaitExpression' &&
    parent.type !== 'ReturnStatement' &&
    parent.type !== 'ThrowStatement'
  );
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeUseOfOutput:
        'Remove this use of the output from "{{name}}"; "{{name}}" doesn\'t return anything.',
    },
  }),
  create(context) {
    const callExpressionsToCheck: Map<
      TSESTree.Identifier | TSESTree.JSXIdentifier,
      TSESTree.FunctionLike
    > = new Map();
    const functionsWithReturnValue: Set<TSESTree.FunctionLike> = new Set();

    return {
      CallExpression(node: estree.Node) {
        const callExpr = node as TSESTree.CallExpression;
        if (!isReturnValueUsed(callExpr)) {
          return;
        }
        const scope = (context as unknown as RuleContext).sourceCode.getScope(callExpr);
        const reference = scope.references.find(ref => ref.identifier === callExpr.callee);
        if (reference?.resolved) {
          const variable = reference.resolved;
          if (variable.defs.length === 1) {
            const definition = variable.defs[0];
            if (definition.type === 'FunctionName') {
              callExpressionsToCheck.set(reference.identifier, definition.node);
            } else if (definition.type === 'Variable') {
              const { init } = definition.node;
              if (init && (isFunctionExpression(init) || isArrowFunctionExpression(init))) {
                callExpressionsToCheck.set(reference.identifier, init);
              }
            }
          }
        }
      },

      ReturnStatement(node: estree.Node) {
        const returnStmt = node as TSESTree.ReturnStatement;
        if (returnStmt.argument) {
          const ancestors = [...context.sourceCode.getAncestors(node)].reverse();
          const functionNode = ancestors.find(
            node =>
              node.type === 'FunctionExpression' ||
              node.type === 'FunctionDeclaration' ||
              node.type === 'ArrowFunctionExpression',
          );

          functionsWithReturnValue.add(functionNode as TSESTree.FunctionLike);
        }
      },

      ArrowFunctionExpression(node: estree.Node) {
        const arrowFunc = node as TSESTree.ArrowFunctionExpression;
        if (arrowFunc.expression) {
          functionsWithReturnValue.add(arrowFunc);
        }
      },

      ':function'(node: estree.Node) {
        const func = node as
          | TSESTree.FunctionExpression
          | TSESTree.FunctionDeclaration
          | TSESTree.ArrowFunctionExpression;
        if (
          func.async ||
          func.generator ||
          (func.body.type === AST_NODE_TYPES.BlockStatement && func.body.body.length === 0)
        ) {
          functionsWithReturnValue.add(func);
        }
      },

      TSDeclareFunction(node: estree.Node) {
        const declareFunction = node as unknown as TSESTree.TSDeclareFunction;
        if (
          declareFunction.returnType?.typeAnnotation.type &&
          !EMPTY_RETURN_VALUE_KEYWORDS.has(declareFunction.returnType?.typeAnnotation.type)
        ) {
          functionsWithReturnValue.add(declareFunction);
        }
      },

      'Program:exit'() {
        callExpressionsToCheck.forEach((functionDeclaration, callee) => {
          if (!functionsWithReturnValue.has(functionDeclaration)) {
            context.report({
              messageId: 'removeUseOfOutput',
              node: callee as estree.Node,
              data: { name: callee.name },
            });
          }
        });
      },
    };
  },
};
