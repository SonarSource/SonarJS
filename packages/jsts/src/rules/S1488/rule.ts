/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1488

import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isFunction,
  isIdentifier,
  isRequiredParserServices,
  last,
} from '../helpers/index.js';
import type { Rule } from 'eslint';
import type estree from 'estree';
import * as meta from './generated-meta.js';
import { getJSDocType } from 'typescript';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
        const lastStatement = last(statements);
        const returnedIdentifier = getOnlyReturnedVariable(lastStatement);

        const lastButOne = statements.at(-2)!;
        const declaredIdentifier = getOnlyDeclaredVariable(lastButOne);

        if (returnedIdentifier && declaredIdentifier) {
          const sameVariable = getVariables(node, context).find(variable => {
            return (
              variable.references.some(ref => ref.identifier === returnedIdentifier) &&
              variable.references.some(ref => ref.identifier === declaredIdentifier.id)
            );
          });

          const id = (lastButOne as estree.VariableDeclaration).declarations[0].id;
          if (hasJSDoc(id) || isNamedFunctionExpression(id)) {
            // 1) The temporary variable might be due to adding the jsdoc. Skip in this case.
            // 2) The temporary variable might be a name of a function, which helps with recognizing in a call stack.
            return;
          }

          // there must be only one "read" - in `return` or `throw`
          if (sameVariable && sameVariable.references.filter(ref => ref.isRead()).length === 1) {
            context.report({
              messageId: 'doImmediateAction',
              data: {
                action: lastStatement.type === 'ReturnStatement' ? 'return' : 'throw',
                variable: returnedIdentifier.name,
              },
              node: declaredIdentifier.init,
              fix: fixer =>
                fix(fixer, lastStatement, lastButOne, declaredIdentifier.init, returnedIdentifier),
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

    function hasJSDoc(node: estree.Node) {
      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        return false;
      }
      return !!getJSDocType(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
    }

    function isNamedFunctionExpression(node: estree.Node) {
      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        return false;
      }
      return isFunction(node, services);
    }
  },
};

function getOnlyReturnedVariable(node: estree.Statement) {
  return (node.type === 'ReturnStatement' || node.type === 'ThrowStatement') &&
    node.argument &&
    isIdentifier(node.argument)
    ? node.argument
    : undefined;
}

function getOnlyDeclaredVariable(node: estree.Statement) {
  if (node.type === 'VariableDeclaration' && node.declarations.length === 1) {
    const { id, init } = node.declarations[0];
    if (id.type === 'Identifier' && init && !(id as TSESTree.Identifier).typeAnnotation) {
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
