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
// https://sonarsource.github.io/rspec/#/rspec/S3516/javascript

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '../helpers/type.js';
import { childrenOf, findFirstMatchingAncestor, getParent } from '../helpers/ancestor.js';
import { FUNCTION_NODES, isElementWrite } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

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
  meta: generateMeta(meta),

  create(context: Rule.RuleContext) {
    const functionContextStack: FunctionContext[] = [];
    const codePathSegments: Rule.CodePathSegment[][] = [];
    let currentCodePathSegments: Rule.CodePathSegment[] = [];

    const checkOnFunctionExit = (node: estree.Node) =>
      checkInvariantReturnStatements(node, functionContextStack.at(-1));

    function checkInvariantReturnStatements(node: estree.Node, functionContext?: FunctionContext) {
      if (!functionContext || hasDifferentReturnTypes(functionContext, currentCodePathSegments)) {
        return;
      }

      const returnedValues = functionContext.returnStatements.map(
        returnStatement => returnStatement.argument as estree.Node,
      );
      if (areAllSameValue(returnedValues, context.sourceCode.getScope(node))) {
        // Only suppress when the returned value is a non-literal (e.g., a variable used for chaining).
        // Functions returning literals (false, null, 0, etc.) have no chaining rationale and are always flagged.
        const firstValue = getLiteralValue(returnedValues[0], context.sourceCode.getScope(node));
        if (
          firstValue === undefined &&
          hasSideEffectOnlyConditional(node, context.sourceCode.visitorKeys)
        ) {
          return;
        }
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
      onCodePathSegmentStart: (segment: Rule.CodePathSegment) => {
        currentCodePathSegments.push(segment);
      },
      onCodePathSegmentEnd() {
        currentCodePathSegments.pop();
      },
      ReturnStatement(node: estree.Node) {
        const currentContext = functionContextStack.at(-1);
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
      const readReferenceIdentifiers = new Set(
        singleWriteVariable.variable.references.slice(1).map(ref => ref.identifier),
      );
      return returnedValues.every(returnedValue =>
        readReferenceIdentifiers.has(returnedValue as estree.Identifier),
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
    expressionStatement?.type === 'ExpressionStatement' &&
    (isElementWrite(expressionStatement, ref) ||
      expressionStatement.expression.type === 'CallExpression')
  );
}

function getLiteralValue(returnedValue: estree.Node, scope: Scope.Scope): LiteralValue | undefined {
  if (returnedValue.type === 'Literal') {
    return returnedValue.value;
  } else if (returnedValue.type === 'UnaryExpression') {
    const innerReturnedValue = getLiteralValue(returnedValue.argument, scope);
    return innerReturnedValue === undefined
      ? undefined
      : evaluateUnaryLiteralExpression(returnedValue.operator, innerReturnedValue);
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

const CONDITIONAL_LOOP_NODE_TYPES = new Set([
  'IfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
]);

/**
 * Returns true if the function body contains a conditional or loop construct where at least
 * one branch has side effects (call or assignment expressions) but no return statement.
 * This pattern indicates an intentional invariant return used for chaining or signaling.
 */
function hasSideEffectOnlyConditional(
  funcNode: estree.Node,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  const body = (funcNode as estree.Function).body;
  if (body?.type !== 'BlockStatement') {
    return false;
  }
  return findSideEffectOnlyConditional(body, visitorKeys);
}

function findSideEffectOnlyConditional(
  node: estree.Node,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  if (FUNCTION_NODES.includes(node.type)) {
    return false;
  }
  if (
    CONDITIONAL_LOOP_NODE_TYPES.has(node.type) &&
    conditionalHasSideEffectOnlyBranch(node, visitorKeys)
  ) {
    return true;
  }
  return childrenOf(node, visitorKeys).some(child =>
    findSideEffectOnlyConditional(child, visitorKeys),
  );
}

function conditionalHasSideEffectOnlyBranch(
  node: estree.Node,
  visitorKeys: SourceCode.VisitorKeys,
): boolean {
  return getBranchBodies(node).some(
    body => nodeHasSideEffect(body, visitorKeys) && !nodeHasReturn(body, visitorKeys),
  );
}

function getBranchBodies(node: estree.Node): estree.Node[] {
  switch (node.type) {
    case 'IfStatement': {
      return node.alternate ? [node.consequent, node.alternate] : [node.consequent];
    }
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
      return [(node as { body: estree.Node }).body];
    case 'SwitchStatement':
      return node.cases;
    default:
      return [];
  }
}

function nodeHasSideEffect(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): boolean {
  if (FUNCTION_NODES.includes(node.type)) {
    return false;
  }
  if (node.type === 'ExpressionStatement') {
    const { expression } = node;
    if (expression.type === 'CallExpression' || expression.type === 'AssignmentExpression') {
      return true;
    }
  }
  return childrenOf(node, visitorKeys).some(child => nodeHasSideEffect(child, visitorKeys));
}

function nodeHasReturn(node: estree.Node, visitorKeys: SourceCode.VisitorKeys): boolean {
  if (FUNCTION_NODES.includes(node.type)) {
    return false;
  }
  if (node.type === 'ReturnStatement') {
    return true;
  }
  return childrenOf(node, visitorKeys).some(child => nodeHasReturn(child, visitorKeys));
}
