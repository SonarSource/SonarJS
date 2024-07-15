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
// https://sonarsource.github.io/rspec/#/rspec/S3516/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import {
  findFirstMatchingAncestor,
  FUNCTION_NODES,
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  isElementWrite,
  report,
  RuleContext,
  SONAR_RUNTIME,
  toSecondaryLocation,
} from '../helpers';
import rspecMeta from './meta.json';
import CodePathSegment = Rule.CodePathSegment;

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
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),

  create(context: Rule.RuleContext) {
    const functionContextStack: FunctionContext[] = [];
    const codePathSegments: Rule.CodePathSegment[][] = [];
    let currentCodePathSegments: Rule.CodePathSegment[] = [];

    const checkOnFunctionExit = (node: estree.Node) =>
      checkInvariantReturnStatements(node, functionContextStack[functionContextStack.length - 1]);

    function checkInvariantReturnStatements(node: estree.Node, functionContext?: FunctionContext) {
      if (!functionContext || hasDifferentReturnTypes(functionContext, currentCodePathSegments)) {
        return;
      }

      const returnedValues = functionContext.returnStatements.map(
        returnStatement => returnStatement.argument as estree.Node,
      );
      if (areAllSameValue(returnedValues, context.sourceCode.getScope(node))) {
        report(
          context,
          {
            message: `Refactor this function to not always return the same value.`,
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionLike,
              getParent(context, node) as TSESTree.Node,
              context as unknown as RuleContext,
            ),
          },
          returnedValues.map(node => toSecondaryLocation(node, 'Returned value.')),
          returnedValues.length,
        );
      }
    }

    return {
      onCodePathStart(codePath: Rule.CodePath) {
        functionContextStack.push({
          codePath,
          containsReturnWithoutValue: false,
          returnStatements: [],
        });
        codePathSegments.push(currentCodePathSegments);
        currentCodePathSegments = [];
      },
      onCodePathEnd() {
        functionContextStack.pop();
        currentCodePathSegments = codePathSegments.pop() || [];
      },
      onCodePathSegmentStart: (segment: CodePathSegment) => {
        currentCodePathSegments.push(segment);
      },
      onCodePathSegmentEnd() {
        currentCodePathSegments.pop();
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

function hasDifferentReturnTypes(
  functionContext: FunctionContext,
  currentSegments: Rule.CodePathSegment[],
) {
  // As this method is called at the exit point of a function definition, the current
  // segments are the ones leading to the exit point at the end of the function. If they
  // are reachable, it means there is an implicit return.
  const hasImplicitReturn = currentSegments.some(segment => segment.reachable);

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
    if (singleWriteVariable?.initExpression) {
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
