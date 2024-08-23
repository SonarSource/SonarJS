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
// https://sonarsource.github.io/rspec/#/rspec/S1488

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isIdentifier } from '../helpers';
import { Rule } from 'eslint';
import estree from 'estree';
import { meta } from './meta';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      doImmediateAction:
        'Immediately {{action}} this expression instead of assigning it to the temporary variable "{{variable}}".',
    },
    fixable: 'code',
  }),
  create(context) {
    return {
      BlockStatement(node: estree.BlockStatement) {
        processStatements(node, node.body);
      },
      SwitchCase(node: estree.SwitchCase) {
        processStatements(node, node.consequent);
      },
    };

    function processStatements(node: estree.Node, statements: estree.Statement[]) {
      if (statements.length > 1) {
        const last = statements[statements.length - 1];
        const returnedIdentifier = getOnlyReturnedVariable(last);

        const lastButOne = statements[statements.length - 2];
        const declaredIdentifier = getOnlyDeclaredVariable(lastButOne);

        if (returnedIdentifier && declaredIdentifier) {
          const sameVariable = getVariables(node, context).find(variable => {
            return (
              variable.references.find(ref => ref.identifier === returnedIdentifier) !==
                undefined &&
              variable.references.find(ref => ref.identifier === declaredIdentifier.id) !==
                undefined
            );
          });

          // there must be only one "read" - in `return` or `throw`
          if (sameVariable && sameVariable.references.filter(ref => ref.isRead()).length === 1) {
            context.report({
              messageId: 'doImmediateAction',
              data: {
                action: last.type === AST_NODE_TYPES.ReturnStatement ? 'return' : 'throw',
                variable: returnedIdentifier.name,
              },
              node: declaredIdentifier.init,
              fix: fixer =>
                fix(fixer, last, lastButOne, declaredIdentifier.init, returnedIdentifier),
            });
          }
        }
      }
    }

    function fix(
      fixer: Rule.RuleFixer,
      last: estree.Statement,
      lastButOne: estree.Statement,
      expressionToReturn: estree.Expression,
      returnedExpression: estree.Expression,
    ): Rule.Fix[] {
      const expressionText = context.sourceCode.getText(expressionToReturn);
      const rangeToRemoveStart = (lastButOne as TSESTree.Statement).range[0];
      const commentsBetweenStatements = context.sourceCode.getCommentsAfter(lastButOne);
      const rangeToRemoveEnd =
        commentsBetweenStatements.length > 0
          ? (commentsBetweenStatements[0] as TSESTree.Comment).range[0]
          : (last as TSESTree.Statement).range[0];
      return [
        fixer.removeRange([rangeToRemoveStart, rangeToRemoveEnd]),
        fixer.replaceText(returnedExpression, expressionText),
      ];
    }

    function getOnlyReturnedVariable(node: estree.Statement) {
      return (node.type === AST_NODE_TYPES.ReturnStatement ||
        node.type === AST_NODE_TYPES.ThrowStatement) &&
        node.argument &&
        isIdentifier(node.argument)
        ? node.argument
        : undefined;
    }

    function getOnlyDeclaredVariable(node: estree.Statement) {
      if (node.type === AST_NODE_TYPES.VariableDeclaration && node.declarations.length === 1) {
        const { id, init } = node.declarations[0];
        if (
          id.type === AST_NODE_TYPES.Identifier &&
          init &&
          !(id as TSESTree.Identifier).typeAnnotation
        ) {
          return { id, init };
        }
      }
      return undefined;
    }

    function getVariables(node: estree.Node, context: Rule.RuleContext) {
      const { variableScope, variables: currentScopeVariables } = context.sourceCode.getScope(node);
      if (variableScope === context.sourceCode.getScope(node)) {
        return currentScopeVariables;
      } else {
        return currentScopeVariables.concat(variableScope.variables);
      }
    }
  },
};
