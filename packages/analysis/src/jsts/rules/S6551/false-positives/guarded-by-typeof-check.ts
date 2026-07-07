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

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../../helpers/ancestor.js';
import { getVariableFromScope, isFunctionNode, isIfStatement } from '../../helpers/ast.js';
import {
  flattenConjunction,
  flattenDisjunction,
  type NoBaseToStringMatcherContext,
} from './helpers.js';

const SAFE_TYPEOF_VALUES = new Set([
  'string',
  'number',
  'bigint',
  'boolean',
  'symbol',
  'undefined',
  'function',
]);

/**
 * Suppresses string concatenation or template interpolation reports when an enclosing
 * if-consequent is guarded by typeof checks proving the same bound value is primitive.
 */
export function isGuardedByTypeofCheckFalsePositive(
  reportDescriptor: Rule.ReportDescriptor,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (!('node' in reportDescriptor)) {
    return false;
  }

  const node = reportDescriptor.node as TSESTree.Node;
  if (node.type !== 'Identifier' || !isInImplicitStringContext(node)) {
    return false;
  }

  const variable = getVariableFromScope(ruleContext.sourceCode.getScope(node), node.name);
  if (!variable) {
    return false;
  }

  let current: TSESTree.Node | undefined = node;
  while (current?.parent) {
    const parent: TSESTree.Node = current.parent;
    if (
      isIfStatement(parent) &&
      parent.consequent === current &&
      conditionProvesPrimitive(parent.test, variable, ruleContext) &&
      !hasInvalidatingWrite(variable, parent.consequent, node, ruleContext)
    ) {
      return true;
    }
    if (isFunctionNode(parent as estree.Node)) {
      break;
    }
    current = parent;
  }
  return false;
}

function isInImplicitStringContext(node: TSESTree.Identifier): boolean {
  let current: TSESTree.Node = node;
  while (current.parent) {
    const parent: TSESTree.Node = current.parent;
    if (
      parent.type === 'TemplateLiteral' &&
      parent.expressions.includes(current as TSESTree.Expression)
    ) {
      return true;
    }
    if (parent.type === 'BinaryExpression' && parent.operator === '+') {
      return true;
    }
    if (
      parent.type !== 'TSAsExpression' &&
      parent.type !== 'TSTypeAssertion' &&
      parent.type !== 'TSNonNullExpression'
    ) {
      return false;
    }
    current = parent;
  }
  return false;
}

function conditionProvesPrimitive(
  condition: TSESTree.Expression,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (condition.type === 'LogicalExpression') {
    if (condition.operator === '&&') {
      return flattenConjunction(condition).some(conjunct =>
        conditionProvesPrimitive(conjunct, variable, ruleContext),
      );
    }
    if (condition.operator === '||') {
      return flattenDisjunction(condition).every(disjunct =>
        conditionProvesPrimitive(disjunct, variable, ruleContext),
      );
    }
    return false;
  }

  if (condition.type !== 'BinaryExpression') {
    return false;
  }

  const { left, operator, right } = condition;
  return (
    (operator === '===' &&
      ((isTypeofComparison(left, right, variable, ruleContext) &&
        isSafeTypeofLiteral(right, SAFE_TYPEOF_VALUES)) ||
        (isTypeofComparison(right, left, variable, ruleContext) &&
          isSafeTypeofLiteral(left, SAFE_TYPEOF_VALUES)))) ||
    (operator === '!==' &&
      ((isTypeofComparison(left, right, variable, ruleContext) &&
        isTypeofLiteral(right, 'object')) ||
        (isTypeofComparison(right, left, variable, ruleContext) &&
          isTypeofLiteral(left, 'object'))))
  );
}

function isTypeofComparison(
  typeofSide: TSESTree.Expression,
  literalSide: TSESTree.Expression,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    literalSide.type === 'Literal' &&
    typeof literalSide.value === 'string' &&
    typeofSide.type === 'UnaryExpression' &&
    typeofSide.operator === 'typeof' &&
    typeofSide.argument.type === 'Identifier' &&
    getVariableFromScope(
      ruleContext.sourceCode.getScope(typeofSide.argument),
      typeofSide.argument.name,
    ) === variable
  );
}

function isSafeTypeofLiteral(node: TSESTree.Expression, safeValues: ReadonlySet<string>): boolean {
  return node.type === 'Literal' && typeof node.value === 'string' && safeValues.has(node.value);
}

function isTypeofLiteral(node: TSESTree.Expression, value: string): boolean {
  return node.type === 'Literal' && node.value === value;
}

function hasWriteBefore(
  variable: Scope.Variable,
  node: TSESTree.Node,
  end: number,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (node.range[0] >= end || isFunctionNode(node as estree.Node)) {
    return false;
  }
  if (
    node.type === 'Identifier' &&
    isWriteIdentifier(node) &&
    getVariableFromScope(ruleContext.sourceCode.getScope(node), node.name) === variable
  ) {
    return true;
  }
  return childrenOf(node as estree.Node, ruleContext.sourceCode.visitorKeys).some(child =>
    hasWriteBefore(variable, child as TSESTree.Node, end, ruleContext),
  );
}

function hasInvalidatingWrite(
  variable: Scope.Variable,
  branch: TSESTree.Statement,
  usage: TSESTree.Identifier,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    hasWriteBefore(variable, branch, usage.range[0], ruleContext) ||
    getLoopAncestors(usage, branch).some(loop => hasWriteAnywhere(variable, loop, ruleContext))
  );
}

function getLoopAncestors(node: TSESTree.Node, boundary: TSESTree.Statement): TSESTree.Node[] {
  const loops: TSESTree.Node[] = [];
  let current: TSESTree.Node | undefined = node;
  while (current && current !== boundary) {
    const parent: TSESTree.Node | undefined = current.parent;
    if (!parent) {
      break;
    }
    if (isLoopLike(parent)) {
      loops.push(parent);
    }
    current = parent;
  }
  return loops;
}

function hasWriteAnywhere(
  variable: Scope.Variable,
  node: TSESTree.Node,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (
    node.type === 'Identifier' &&
    isWriteIdentifier(node) &&
    getVariableFromScope(ruleContext.sourceCode.getScope(node), node.name) === variable
  ) {
    return true;
  }
  return childrenOf(node as estree.Node, ruleContext.sourceCode.visitorKeys).some(child =>
    hasWriteAnywhere(variable, child as TSESTree.Node, ruleContext),
  );
}

function isLoopLike(node: TSESTree.Node): boolean {
  return (
    node.type === 'WhileStatement' ||
    node.type === 'DoWhileStatement' ||
    node.type === 'ForStatement' ||
    node.type === 'ForOfStatement' ||
    node.type === 'ForInStatement'
  );
}

function isWriteIdentifier(node: TSESTree.Identifier): boolean {
  const parent = node.parent;
  return (
    (parent?.type === 'AssignmentExpression' && parent.left === node) ||
    (parent?.type === 'AssignmentPattern' && parent.left === node) ||
    (parent?.type === 'UpdateExpression' && parent.argument === node) ||
    (parent?.type === 'VariableDeclarator' && parent.id === node)
  );
}
