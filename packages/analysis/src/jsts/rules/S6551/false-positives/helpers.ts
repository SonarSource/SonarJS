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
import type { Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../../helpers/ancestor.js';
import {
  getVariableFromScope,
  isFunctionNode,
  isIdentifier,
  isStringLiteral,
  type LoopLike,
} from '../../helpers/ast.js';
import { areEquivalent } from '../../helpers/equivalence.js';
import { isGenericType } from '../../helpers/type.js';

export type NoBaseToStringMatcherContext = {
  sourceCode: SourceCode;
  services: Parameters<typeof isGenericType>[1];
};

/**
 * Returns the operands of a logical `&&` expression as a flat left-to-right list.
 * Non-`&&` expressions are returned as a single-item list.
 */
export function flattenConjunction(condition: TSESTree.Expression): TSESTree.Expression[] {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&') {
    return [...flattenConjunction(condition.left), ...flattenConjunction(condition.right)];
  }
  return [condition];
}

/**
 * Returns the operands of a logical `||` expression as a flat left-to-right list.
 * Non-`||` expressions are returned as a single-item list.
 */
export function flattenDisjunction(condition: TSESTree.Expression): TSESTree.Expression[] {
  if (condition.type === 'LogicalExpression' && condition.operator === '||') {
    return [...flattenDisjunction(condition.left), ...flattenDisjunction(condition.right)];
  }
  return [condition];
}

/**
 * Returns the direct branch of an `if` statement when `node` is exactly its consequent or alternate.
 * Descendant nodes are not searched.
 */
export function getDirectIfBranch(
  ifStatement: TSESTree.IfStatement,
  node: TSESTree.Node,
): { node: TSESTree.Statement; consequent: boolean } | null {
  if (ifStatement.consequent === node) {
    return { node: ifStatement.consequent, consequent: true };
  }
  if (ifStatement.alternate === node) {
    return { node: ifStatement.alternate, consequent: false };
  }
  return null;
}

/**
 * Checks whether a call is the direct expression evaluated by the first statement of a branch:
 *
 *   if (condition) {
 *     return value.toString(); // match
 *   }
 *
 *   if (condition) {
 *     mutate(value);
 *     return value.toString(); // non-match
 *   }
 */
export function isCallInFirstStatementOfBranch(
  call: TSESTree.CallExpression,
  branch: TSESTree.Statement | null,
): boolean {
  if (!branch) {
    return false;
  }

  const firstStatement = branch.type === 'BlockStatement' ? branch.body[0] : branch;
  return firstStatement !== undefined && startsWithCall(firstStatement, call);
}

/**
 * Accepts only statement forms where the call itself is evaluated first.
 * `return value.toString()` matches; `return mutate(value) && value.toString()` does not.
 */
function startsWithCall(statement: TSESTree.Statement, call: TSESTree.CallExpression): boolean {
  if (statement.type === 'ReturnStatement') {
    return statement.argument === call;
  }

  if (statement.type === 'ExpressionStatement') {
    return statement.expression === call;
  }

  if (statement.type === 'VariableDeclaration' && statement.declarations.length === 1) {
    return statement.declarations[0].init === call;
  }

  return false;
}

/**
 * Checks whether one side of a comparison is `typeof <identifier>` for the given variable, and the
 * other side is a string literal.
 */
export function isTypeofVariableComparedToStringLiteral(
  typeofSide: TSESTree.Expression,
  literalSide: TSESTree.Expression,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  const literal = literalSide as estree.Node;
  return (
    isStringLiteral(literal) &&
    typeofSide.type === 'UnaryExpression' &&
    typeofSide.operator === 'typeof' &&
    typeofSide.argument.type === 'Identifier' &&
    getVariableFromScope(
      ruleContext.sourceCode.getScope(typeofSide.argument),
      typeofSide.argument.name,
    ) === variable
  );
}

/**
 * Checks whether a subtree contains an identifier with the given name.
 */
export function containsIdentifier(
  node: TSESTree.Node | null | undefined,
  variableName: string,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (!node) {
    return false;
  }
  if (isIdentifier(node, variableName)) {
    return true;
  }
  return childrenOf(node as estree.Node, ruleContext.sourceCode.visitorKeys).some(child =>
    containsIdentifier(child as TSESTree.Node, variableName, ruleContext),
  );
}

/**
 * Checks whether any statement after `statementIndex` in a block contains an identifier name.
 */
export function containsIdentifierAfterStatement(
  block: TSESTree.BlockStatement,
  statementIndex: number,
  variableName: string,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return block.body
    .slice(statementIndex + 1)
    .some(statement => containsIdentifier(statement, variableName, ruleContext));
}

/**
 * Checks whether an identifier is the syntactic target of a write.
 */
export function isWriteIdentifier(node: TSESTree.Identifier): boolean {
  const parent = node.parent;
  return (
    (parent?.type === 'AssignmentExpression' && parent.left === node) ||
    (parent?.type === 'AssignmentPattern' && parent.left === node) ||
    (parent?.type === 'UpdateExpression' && parent.argument === node) ||
    (parent?.type === 'VariableDeclarator' && parent.id === node)
  );
}

/**
 * Checks whether the subtree contains a write to the given variable before `end`.
 * Nested function bodies are skipped because their writes are not executed in the current flow.
 */
export function hasWriteInSubtreeBefore(
  variable: Scope.Variable,
  node: TSESTree.Node,
  end: number,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (node.range[0] >= end || isFunctionNode(node as estree.Node)) {
    return false;
  }
  if (isWriteToVariable(node, variable, ruleContext)) {
    return true;
  }
  return childrenOf(node as estree.Node, ruleContext.sourceCode.visitorKeys).some(child =>
    hasWriteInSubtreeBefore(variable, child as TSESTree.Node, end, ruleContext),
  );
}

/**
 * Checks whether the subtree contains any write to the given variable.
 */
export function hasWriteInSubtree(
  variable: Scope.Variable,
  node: TSESTree.Node,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (isWriteToVariable(node, variable, ruleContext)) {
    return true;
  }
  return childrenOf(node as estree.Node, ruleContext.sourceCode.visitorKeys).some(child =>
    hasWriteInSubtree(variable, child as TSESTree.Node, ruleContext),
  );
}

function isWriteToVariable(
  node: TSESTree.Node,
  variable: Scope.Variable,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    node.type === 'Identifier' &&
    isWriteIdentifier(node) &&
    getVariableFromScope(ruleContext.sourceCode.getScope(node), node.name) === variable
  );
}

/**
 * Checks whether a node is one of the JavaScript loop statement forms.
 */
export function isLoopLike(node: TSESTree.Node): node is TSESTree.Node & LoopLike {
  return (
    node.type === 'WhileStatement' ||
    node.type === 'DoWhileStatement' ||
    node.type === 'ForStatement' ||
    node.type === 'ForOfStatement' ||
    node.type === 'ForInStatement'
  );
}

/**
 * Returns loop ancestors between `node` and `boundary`, excluding the boundary itself.
 */
export function getLoopAncestors(
  node: TSESTree.Node,
  boundary: TSESTree.Statement,
): TSESTree.Node[] {
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

/**
 * Checks whether an expression can be read repeatedly without evaluating user code.
 * `value` and `this` match; `holder.value` does not because it may invoke a getter.
 */
export function isSingleEvaluationReceiver(node: TSESTree.Node): boolean {
  return isIdentifier(node) || node.type === 'ThisExpression';
}

/**
 * Checks whether a node is a non-computed `.toString` member read on the same receiver expression.
 * `value.toString` matches for `value`; `value['toString']` and `other.toString` do not.
 */
export function isNonComputedToStringMemberOnReceiver(
  node: TSESTree.Node,
  receiver: TSESTree.Expression,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'toString') &&
    areEquivalent(node.object, receiver, ruleContext.sourceCode)
  );
}

/**
 * Checks whether a node is exactly the non-computed member expression `Object.prototype.toString`.
 */
export function isObjectPrototypeToStringMember(node: TSESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'toString') &&
    node.object.type === 'MemberExpression' &&
    !node.object.computed &&
    isIdentifier(node.object.object, 'Object') &&
    isIdentifier(node.object.property, 'prototype')
  );
}
