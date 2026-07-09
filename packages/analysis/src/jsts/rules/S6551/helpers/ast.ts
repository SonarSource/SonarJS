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
import type { SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../../helpers/ancestor.js';
import { isCallingMethod, isIdentifier } from '../../helpers/ast.js';
import { areEquivalent } from '../../helpers/equivalence.js';

/**
 * Accepted shapes:
 *   value.toString()
 *   value.toString
 *   value
 *
 * Reason: upstream reports may point at the full call, the member access, or the receiver, and
 * S6551 normalizes all three back to the same direct `value.toString()` call.
 */
export function getReportedToStringCall(node: TSESTree.Node): TSESTree.CallExpression | undefined {
  if (
    node.type === 'CallExpression' &&
    isCallingMethod(node as estree.CallExpression, 0, 'toString')
  ) {
    return node;
  }
  if (
    node.type === 'MemberExpression' &&
    node.parent?.type === 'CallExpression' &&
    node.parent.callee === node &&
    isCallingMethod(node.parent as estree.CallExpression, 0, 'toString')
  ) {
    return node.parent;
  }

  const parent: TSESTree.Node | undefined = node.parent;
  if (
    parent?.type === 'MemberExpression' &&
    parent.object === node &&
    parent.parent?.type === 'CallExpression' &&
    parent.parent.callee === parent &&
    isCallingMethod(parent.parent as estree.CallExpression, 0, 'toString')
  ) {
    return parent.parent;
  }
  return undefined;
}

/**
 * Accepted shape:
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     return value.toString();
 *   }
 *
 * Rejected shape:
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     mutate(value);
 *     return value.toString();
 *   }
 *
 * Why S6551 cares: the guarded `toString()` call must be the branch's first evaluation.
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
 * Accepted shapes:
 *   return value.toString()
 *   value.toString()
 *   const rendered = value.toString()
 *
 * Rejected shape:
 *   return mutate(value) && value.toString()
 *
 * Why S6551 cares: the helper only accepts statements where the reported call is the first
 * evaluated node.
 */
export function startsWithCall(
  statement: TSESTree.Statement,
  call: TSESTree.CallExpression,
): boolean {
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
 * Accepted shapes:
 *
 *   value.toString !== Object.prototype.toString
 *   typeof value === 'object' &&
 *   value !== null &&
 *   typeof value.toString === 'function' &&
 *   value.toString !== Object.prototype.toString
 *
 * Rejected shapes:
 *   value.toString !== Object.prototype.toString || fallback
 *   value.toString !== Object.prototype.toString && hasSideEffect()
 *
 * Why S6551 cares: suppression requires one conjunct proving `value.toString` is not the
 * inherited `Object.prototype.toString`; extra conjuncts may only narrow the receiver or prove
 * `value.toString` is callable.
 */
export function provesCustomToString(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  sourceCode: SourceCode,
  positiveBranch: boolean,
): boolean {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&' && positiveBranch) {
    const conjuncts = flattenConjunction(condition);
    return (
      conjuncts.some(conjunct => provesCustomToString(conjunct, receiver, sourceCode, true)) &&
      conjuncts.every(
        conjunct =>
          provesCustomToString(conjunct, receiver, sourceCode, true) ||
          provesReceiverToStringIsFunction(conjunct, receiver, sourceCode) ||
          provesReceiverIsObjectLike(conjunct, receiver, sourceCode),
      )
    );
  }

  if (condition.type !== 'BinaryExpression') {
    return false;
  }

  const expectedOperator = positiveBranch ? '!==' : '===';
  return (
    condition.operator === expectedOperator &&
    ((isReceiverToString(condition.left, receiver, sourceCode) &&
      isObjectPrototypeToString(condition.right)) ||
      (isObjectPrototypeToString(condition.left) &&
        isReceiverToString(condition.right, receiver, sourceCode)))
  );
}

export function flattenConjunction(condition: TSESTree.Expression): TSESTree.Expression[] {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&') {
    return [...flattenConjunction(condition.left), ...flattenConjunction(condition.right)];
  }
  return [condition];
}

/**
 * Accepted shape:
 *   typeof value.toString === 'function'
 *
 * Rejected as a standalone proof:
 *   if (typeof value.toString === 'function') {
 *     return value.toString();
 *   }
 *
 * Why S6551 cares: the inherited default method is callable too, so this check only supports the
 * explicit `value.toString !== Object.prototype.toString` comparison.
 */
export function provesReceiverToStringIsFunction(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  sourceCode: SourceCode,
): boolean {
  return (
    condition.type === 'BinaryExpression' &&
    condition.operator === '===' &&
    ((condition.left.type === 'UnaryExpression' &&
      condition.left.operator === 'typeof' &&
      isReceiverToString(condition.left.argument, receiver, sourceCode) &&
      condition.right.type === 'Literal' &&
      condition.right.value === 'function') ||
      (condition.right.type === 'UnaryExpression' &&
        condition.right.operator === 'typeof' &&
        isReceiverToString(condition.right.argument, receiver, sourceCode) &&
        condition.left.type === 'Literal' &&
        condition.left.value === 'function'))
  );
}

/**
 * Accepted shapes:
 *
 *   typeof value === 'object'
 *   value !== null
 *
 * Rejected as a standalone proof:
 *   if (typeof value === 'object' && value !== null) {
 *     return value.toString();
 *   }
 *
 * Why S6551 cares: these checks only make the property read safe enough to analyze; they do not
 * prove that `value.toString` is custom.
 */
export function provesReceiverIsObjectLike(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  sourceCode: SourceCode,
): boolean {
  return (
    condition.type === 'BinaryExpression' &&
    ((condition.operator === '===' &&
      ((condition.left.type === 'UnaryExpression' &&
        condition.left.operator === 'typeof' &&
        areEquivalent(condition.left.argument, receiver, sourceCode) &&
        condition.right.type === 'Literal' &&
        condition.right.value === 'object') ||
        (condition.right.type === 'UnaryExpression' &&
          condition.right.operator === 'typeof' &&
          areEquivalent(condition.right.argument, receiver, sourceCode) &&
          condition.left.type === 'Literal' &&
          condition.left.value === 'object'))) ||
      (condition.operator === '!==' &&
        ((areEquivalent(condition.left, receiver, sourceCode) &&
          condition.right.type === 'Literal' &&
          condition.right.value === null) ||
          (areEquivalent(condition.right, receiver, sourceCode) &&
            condition.left.type === 'Literal' &&
            condition.left.value === null))))
  );
}

/**
 * Accepted shapes:
 *   result !== '[object Object]'  // consequent is the accepted branch
 *   result === '[object Object]'  // else branch is the accepted branch
 *
 * Why S6551 cares: the helper identifies which branch keeps the non-default string result.
 */
export function provesAcceptedResult(
  condition: TSESTree.Expression,
  variableName: string,
  positiveBranch: boolean,
): boolean {
  if (condition.type !== 'BinaryExpression') {
    return false;
  }
  const expectedOperator = positiveBranch ? '!==' : '===';
  return (
    condition.operator === expectedOperator &&
    ((isIdentifier(condition.left, variableName) &&
      condition.right.type === 'Literal' &&
      condition.right.value === '[object Object]') ||
      (isIdentifier(condition.right, variableName) &&
        condition.left.type === 'Literal' &&
        condition.left.value === '[object Object]'))
  );
}

/**
 * Accepted shape:
 *   value.toString
 *
 * Rejected shapes:
 *   value['toString']
 *   other.toString
 *
 * Why S6551 cares: the matcher only accepts a non-computed `.toString` read on the same receiver.
 */
export function isReceiverToString(
  node: TSESTree.Node,
  receiver: TSESTree.Expression,
  sourceCode: SourceCode,
): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'toString') &&
    areEquivalent(node.object, receiver, sourceCode)
  );
}

/**
 * Accepted shape:
 *   Object.prototype.toString
 *
 * Rejected shapes:
 *   Object['prototype'].toString
 *   value.toString
 *
 * Why S6551 cares: suppression is keyed to the exact default implementation the rule warns about.
 */
export function isObjectPrototypeToString(node: TSESTree.Node): boolean {
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

/**
 * Accepted shapes:
 *   value
 *   this
 *
 * Rejected shape:
 *   holder.value
 *
 * Why S6551 cares: receiver-guard suppression is limited to expressions that can be reused
 * without triggering another read such as a getter.
 */
export function isStableReceiver(node: TSESTree.Node): boolean {
  return isIdentifier(node) || node.type === 'ThisExpression';
}

/**
 * Rejected shape:
 *
 *   const rendered = value.toString();
 *   if (rendered !== '[object Object]') {
 *     return rendered;
 *   }
 *   log(rendered);
 *
 * Why S6551 cares: once the validated result is referenced after the guard, the suppression no
 * longer models a single local validation flow.
 */
export function usesIdentifierAfter(
  block: TSESTree.BlockStatement,
  statementIndex: number,
  variableName: string,
  sourceCode: SourceCode,
): boolean {
  return block.body
    .slice(statementIndex + 1)
    .some(statement => usesIdentifier(statement, variableName, sourceCode));
}

export function usesIdentifier(
  node: TSESTree.Node | null | undefined,
  variableName: string,
  sourceCode: SourceCode,
): boolean {
  if (!node) {
    return false;
  }
  if (isIdentifier(node, variableName)) {
    return true;
  }
  return childrenOf(node as estree.Node, sourceCode.visitorKeys).some(child =>
    usesIdentifier(child as TSESTree.Node, variableName, sourceCode),
  );
}
