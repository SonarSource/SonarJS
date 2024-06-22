/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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

import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import {
  isReturnStatement,
  isThrowStatement,
  isIdentifier,
  isVariableDeclaration,
} from '../utils/nodes';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      doImmediateAction:
        'Immediately {{action}} this expression instead of assigning it to the temporary variable "{{variable}}".',
    },
    schema: [],
    type: 'suggestion',
    docs: {
      description: 'Local variables should not be declared and then immediately returned or thrown',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
    fixable: 'code',
  },
  create(context) {
    return {
      BlockStatement(node: TSESTree.Node) {
        processStatements(node, (node as TSESTree.BlockStatement).body);
      },
      SwitchCase(node: TSESTree.Node) {
        processStatements(node, (node as TSESTree.SwitchCase).consequent);
      },
    };

    function processStatements(node: TSESTree.Node, statements: TSESTree.Statement[]) {
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
                action: isReturnStatement(last) ? 'return' : 'throw',
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

    // eslint-disable-next-line max-params
    function fix(
      fixer: TSESLint.RuleFixer,
      last: TSESTree.Statement,
      lastButOne: TSESTree.Statement,
      expressionToReturn: TSESTree.Expression,
      returnedExpression: TSESTree.Expression,
    ): any {
      const expressionText = context.sourceCode.getText(expressionToReturn);
      const rangeToRemoveStart = lastButOne.range[0];
      const commentsBetweenStatements = context.sourceCode.getCommentsAfter(lastButOne);
      const rangeToRemoveEnd =
        commentsBetweenStatements.length > 0
          ? commentsBetweenStatements[0].range[0]
          : last.range[0];
      return [
        fixer.removeRange([rangeToRemoveStart, rangeToRemoveEnd]),
        fixer.replaceText(returnedExpression, expressionText),
      ];
    }

    function getOnlyReturnedVariable(node: TSESTree.Statement) {
      return (isReturnStatement(node) || isThrowStatement(node)) &&
        node.argument &&
        isIdentifier(node.argument)
        ? node.argument
        : undefined;
    }

    function getOnlyDeclaredVariable(node: TSESTree.Statement) {
      if (isVariableDeclaration(node) && node.declarations.length === 1) {
        const { id, init } = node.declarations[0];
        if (isIdentifier(id) && init && !id.typeAnnotation) {
          return { id, init };
        }
      }
      return undefined;
    }

    function getVariables(node: TSESTree.Node, context: TSESLint.RuleContext<string, string[]>) {
      const { variableScope, variables: currentScopeVariables } = context.sourceCode.getScope(node);
      if (variableScope === context.sourceCode.getScope(node)) {
        return currentScopeVariables;
      } else {
        return currentScopeVariables.concat(variableScope.variables);
      }
    }
  },
};

export = rule;
