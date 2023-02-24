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
// https://sonarsource.github.io/rspec/#/rspec/S3516/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { getMainFunctionTokenLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';
import {
  findFirstMatchingAncestor,
  FUNCTION_NODES,
  getParent,
  isElementWrite,
  RuleContext,
  toEncodedMessage,
} from './helpers';
import { SONAR_RUNTIME } from 'linting/eslint/linter/parameters';

interface FunctionContext {
  codePath: Rule.CodePath;
  containsReturnWithoutValue: boolean;
  returnStatements: estree.ReturnStatement[];
}

interface SingleWriteVariable {
  variable: Scope.Variable;
  initExpression?: estree.Expression | null;
}

type LiteralValue = number | RegExp | string | null | boolean | bigint;

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const functionContextStack: FunctionContext[] = [];

    const checkOnFunctionExit = (node: estree.Node) =>
      checkInvariantReturnStatements(node, functionContextStack[functionContextStack.length - 1]);

    function checkInvariantReturnStatements(node: estree.Node, functionContext?: FunctionContext) {
      if (!functionContext || hasDifferentReturnTypes(functionContext)) {
        return;
      }

      const returnedValues = functionContext.returnStatements.map(
        returnStatement => returnStatement.argument as estree.Node,
      );
      if (areAllSameValue(returnedValues, context.getScope())) {
        const message = toEncodedMessage(
          `Refactor this function to not always return the same value.`,
          returnedValues as TSESTree.Node[],
          returnedValues.map(_ => 'Returned value.'),
          returnedValues.length,
        );

        context.report({
          message,
          loc: getMainFunctionTokenLocation(
            node as TSESTree.FunctionLike,
            getParent(context) as TSESTree.Node,
            context as unknown as RuleContext,
          ),
        });
      }
    }

    return {
      onCodePathStart(codePath: Rule.CodePath) {
        functionContextStack.push({
          codePath,
          containsReturnWithoutValue: false,
          returnStatements: [],
        });
      },
      onCodePathEnd() {
        functionContextStack.pop();
      },
      ReturnStatement(node: estree.Node) {
        const currentContext = functionContextStack[functionContextStack.length - 1];
        if (currentContext) {
          const returnStatement = node as estree.ReturnStatement;
          currentContext.containsReturnWithoutValue =
            currentContext.containsReturnWithoutValue || !returnStatement.argument;
          currentContext.returnStatements.push(returnStatement);
        }
      },
      'FunctionDeclaration:exit': checkOnFunctionExit,
      'FunctionExpression:exit': checkOnFunctionExit,
      'ArrowFunctionExpression:exit': checkOnFunctionExit,
    };
  },
};

function hasDifferentReturnTypes(functionContext: FunctionContext) {
  // As this method is called at the exit point of a function definition, the current
  // segments are the ones leading to the exit point at the end of the function. If they
  // are reachable, it means there is an implicit return.
  const hasImplicitReturn = functionContext.codePath.currentSegments.some(
    segment => segment.reachable,
  );

  return (
    hasImplicitReturn ||
    functionContext.containsReturnWithoutValue ||
    functionContext.returnStatements.length <= 1 ||
    functionContext.codePath.thrownSegments.length > 0
  );
}

function areAllSameValue(returnedValues: estree.Node[], scope: Scope.Scope) {
  const firstReturnedValue = returnedValues[0];
  const firstValue = getLiteralValue(firstReturnedValue, scope);
  if (firstValue !== undefined) {
    return returnedValues
      .slice(1)
      .every(returnedValue => getLiteralValue(returnedValue, scope) === firstValue);
  } else if (firstReturnedValue.type === 'Identifier') {
    const singleWriteVariable = getSingleWriteDefinition(firstReturnedValue.name, scope);
    if (singleWriteVariable) {
      const readReferenceIdentifiers = singleWriteVariable.variable.references
        .slice(1)
        .map(ref => ref.identifier);
      return returnedValues.every(returnedValue =>
        readReferenceIdentifiers.includes(returnedValue as estree.Identifier),
      );
    }
  }
  return false;
}

function getSingleWriteDefinition(
  variableName: string,
  scope: Scope.Scope,
): SingleWriteVariable | null {
  const variable = scope.set.get(variableName);
  if (variable) {
    const references = variable.references.slice(1);
    if (!references.some(ref => ref.isWrite() || isPossibleObjectUpdate(ref))) {
      let initExpression = null;
      if (variable.defs.length === 1 && variable.defs[0].type === 'Variable') {
        initExpression = variable.defs[0].node.init;
      }
      return { variable, initExpression };
    }
  }
  return null;
}

function isPossibleObjectUpdate(ref: Scope.Reference) {
  const expressionStatement = findFirstMatchingAncestor(
    ref.identifier as TSESTree.Node,
    n => n.type === 'ExpressionStatement' || FUNCTION_NODES.includes(n.type),
  ) as estree.Node | undefined;

  // To avoid FP, we consider method calls as write operations, since we do not know whether they will
  // update the object state or not.
  return (
    expressionStatement &&
    expressionStatement.type === 'ExpressionStatement' &&
    (isElementWrite(expressionStatement, ref) ||
      expressionStatement.expression.type === 'CallExpression')
  );
}

function getLiteralValue(returnedValue: estree.Node, scope: Scope.Scope): LiteralValue | undefined {
  if (returnedValue.type === 'Literal') {
    return returnedValue.value;
  } else if (returnedValue.type === 'UnaryExpression') {
    const innerReturnedValue = getLiteralValue(returnedValue.argument, scope);
    return innerReturnedValue !== undefined
      ? evaluateUnaryLiteralExpression(returnedValue.operator, innerReturnedValue)
      : undefined;
  } else if (returnedValue.type === 'Identifier') {
    const singleWriteVariable = getSingleWriteDefinition(returnedValue.name, scope);
    if (singleWriteVariable && singleWriteVariable.initExpression) {
      return getLiteralValue(singleWriteVariable.initExpression, scope);
    }
  }
  return undefined;
}

function evaluateUnaryLiteralExpression(operator: string, innerReturnedValue: LiteralValue) {
  switch (operator) {
    case '-':
      return -Number(innerReturnedValue);
    case '+':
      return Number(innerReturnedValue);
    case '~':
      return ~Number(innerReturnedValue);
    case '!':
      return !Boolean(innerReturnedValue);
    case 'typeof':
      return typeof innerReturnedValue;
    default:
      return undefined;
  }
}
