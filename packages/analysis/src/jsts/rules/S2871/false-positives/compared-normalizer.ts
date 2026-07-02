/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import type { Scope } from 'eslint';
import type estree from 'estree';
import { getNodeParent } from '../../helpers/ancestor.js';
import { getVariableFromName, isIdentifier } from '../../helpers/ast.js';
import {
  getComparatorlessSortCallInfo,
  getEqualityComparisonSibling,
  isJsonStringifyCall,
  isPrimitiveSortReceiver,
  type SortMatcherContext,
} from './helpers.js';

type FunctionNode =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

/**
 * False-positive shapes:
 *   function normalize(values: string[]) {
 *     return values.map(String).sort();
 *   }
 *   JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
 *
 *   const normalize = (values: string[]) => values.toSorted();
 *   JSON.stringify(normalize(a)) !== JSON.stringify(normalize(b))
 *
 *   function normalize(values: number[]) {
 *     return values.sort();
 *   }
 *   JSON.stringify(normalize(before)) == JSON.stringify(normalize(after))
 *
 * What can vary:
 * - function declaration vs local function expression / arrow function
 * - `sort()` vs `toSorted()` inside the helper
 * - the equality operator used around the JSON.stringify comparison
 *
 * The inner sort call is acceptable when the helper is only used as a
 * normalizer inside matching JSON.stringify equality/inequality comparisons.
 */
export function isSortReturnedByComparedNormalizer(
  call: estree.CallExpression,
  ruleContext: SortMatcherContext,
): boolean {
  const callInfo = getComparatorlessSortCallInfo(call, ruleContext);
  const functionVariable = getEnclosingReturnedFunctionVariable(call, ruleContext);
  return (
    callInfo !== null &&
    isPrimitiveSortReceiver(callInfo.receiver, ruleContext) &&
    functionVariable !== null &&
    isUsedOnlyInJsonStringifyComparisons(functionVariable, ruleContext)
  );
}

function getEnclosingReturnedFunctionVariable(
  call: estree.CallExpression,
  ruleContext: SortMatcherContext,
): Scope.Variable | null {
  let currentNode: estree.Node | undefined = getNodeParent(call);

  while (currentNode) {
    if (
      currentNode.type === 'FunctionDeclaration' ||
      currentNode.type === 'FunctionExpression' ||
      currentNode.type === 'ArrowFunctionExpression'
    ) {
      if (!isTrivialSingleReturnNormalizer(currentNode, call)) {
        return null;
      }
      return getLocalFunctionVariable(currentNode, ruleContext);
    }
    currentNode = getNodeParent(currentNode);
  }

  return null;
}

function isTrivialSingleReturnNormalizer(
  functionNode: FunctionNode,
  returnedCall: estree.CallExpression,
): boolean {
  if (functionNode.params.length !== 1) {
    return false;
  }
  if (isReturnedExpressionBody(functionNode, returnedCall)) {
    return true;
  }
  if (functionNode.body.type !== 'BlockStatement' || functionNode.body.body.length !== 1) {
    return false;
  }
  const [statement] = functionNode.body.body;
  return statement.type === 'ReturnStatement' && statement.argument === returnedCall;
}

function isReturnedExpressionBody(functionNode: FunctionNode, childNode: estree.Node): boolean {
  return (
    functionNode.type === 'ArrowFunctionExpression' &&
    functionNode.body.type !== 'BlockStatement' &&
    functionNode.body === childNode
  );
}

function getLocalFunctionVariable(
  functionNode: estree.Node,
  { context }: SortMatcherContext,
): Scope.Variable | null {
  const parent = getNodeParent(functionNode);
  if (parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportDefaultDeclaration') {
    return null;
  }
  if (functionNode.type === 'FunctionDeclaration') {
    if (functionNode.id === null) {
      return null;
    }
    return getVariableFromName(context, functionNode.id.name, functionNode) ?? null;
  }
  if (parent?.type === 'VariableDeclarator' && isIdentifier(parent.id)) {
    const variableDeclaration = getNodeParent(parent);
    if (variableDeclaration?.type === 'VariableDeclaration') {
      const declarationParent = getNodeParent(variableDeclaration);
      if (
        declarationParent?.type === 'ExportNamedDeclaration' ||
        declarationParent?.type === 'ExportDefaultDeclaration'
      ) {
        return null;
      }
    }
    return getVariableFromName(context, parent.id.name, parent) ?? null;
  }
  return null;
}

function isUsedOnlyInJsonStringifyComparisons(
  functionVariable: Scope.Variable,
  ruleContext: SortMatcherContext,
): boolean {
  const reads = functionVariable.references.filter(reference => reference.isRead());
  return (
    reads.length > 0 &&
    reads.every(reference => {
      const parent = getNodeParent(reference.identifier);
      return (
        parent?.type === 'CallExpression' &&
        parent.callee === reference.identifier &&
        isSingleArgumentJsonStringifyFunctionCallComparison(parent, functionVariable, ruleContext)
      );
    })
  );
}

function isSingleArgumentJsonStringifyFunctionCallComparison(
  call: estree.CallExpression,
  functionVariable: Scope.Variable,
  { context }: SortMatcherContext,
): boolean {
  if (call.arguments.length !== 1 || call.arguments[0].type === 'SpreadElement') {
    return false;
  }
  const parent = getNodeParent(call);
  if (!isJsonStringifyCall(parent) || parent.arguments[0] !== call) {
    return false;
  }
  const sibling = getEqualityComparisonSibling(parent);
  if (!isJsonStringifyCall(sibling)) {
    return false;
  }
  const siblingArgument = sibling.arguments[0];
  return (
    siblingArgument.type === 'CallExpression' &&
    siblingArgument.arguments.length === 1 &&
    siblingArgument.arguments[0].type !== 'SpreadElement' &&
    siblingArgument.callee.type === 'Identifier' &&
    getVariableFromName(context, siblingArgument.callee.name, siblingArgument) === functionVariable
  );
}
