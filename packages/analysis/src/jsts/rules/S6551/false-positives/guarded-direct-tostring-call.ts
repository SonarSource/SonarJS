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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../../helpers/ancestor.js';
import { areEquivalent } from '../../helpers/equivalence.js';
import { isCallingMethod, isFunctionNode, isIdentifier, isIfStatement } from '../../helpers/ast.js';
import { flattenConjunction, type NoBaseToStringMatcherContext } from './helpers.js';

export function isGuardedDirectToStringCallFalsePositive(
  reportDescriptor: Rule.ReportDescriptor,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  if (
    !('node' in reportDescriptor) ||
    !('messageId' in reportDescriptor) ||
    reportDescriptor.messageId !== 'baseToString'
  ) {
    return false;
  }

  const call = getReportedToStringCall(reportDescriptor.node as TSESTree.Node);
  return (
    call !== undefined &&
    (isGuardedReceiverCall(call, ruleContext) || isValidatedResultCall(call, ruleContext))
  );
}

function getReportedToStringCall(node: TSESTree.Node): TSESTree.CallExpression | undefined {
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

function isGuardedReceiverCall(
  call: TSESTree.CallExpression,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  const receiver = (call.callee as TSESTree.MemberExpression).object;
  if (!isStableReceiver(receiver)) {
    return false;
  }

  let current: TSESTree.Node | undefined = call;
  while (current?.parent) {
    const parent: TSESTree.Node = current.parent;
    if (isIfStatement(parent)) {
      if (
        parent.consequent === current &&
        isCallInFirstStatementOfBranch(call, parent.consequent) &&
        provesCustomToString(parent.test, receiver, ruleContext, true)
      ) {
        return true;
      }
      if (
        parent.alternate === current &&
        isCallInFirstStatementOfBranch(call, parent.alternate) &&
        provesCustomToString(parent.test, receiver, ruleContext, false)
      ) {
        return true;
      }
    }
    if (isFunctionNode(parent as estree.Node)) {
      break;
    }
    current = parent;
  }
  return false;
}

/**
 * Matches a guarded branch only when the reported call is reached before any sibling statement:
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     return value.toString(); // match
 *   }
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     mutate(value);
 *     return value.toString(); // non-match
 *   }
 */
function isCallInFirstStatementOfBranch(
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
 * Recognizes the branch condition proving a custom implementation.
 *
 * Matches:
 *   value.toString !== Object.prototype.toString
 *   typeof value.toString === 'function' && value.toString !== Object.prototype.toString
 *
 * Non-matches:
 *   value.toString !== Object.prototype.toString || fallback
 *   value.toString !== Object.prototype.toString && hasSideEffect()
 */
function provesCustomToString(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  ruleContext: NoBaseToStringMatcherContext,
  positiveBranch: boolean,
): boolean {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&' && positiveBranch) {
    const conjuncts = flattenConjunction(condition);
    return (
      conjuncts.some(conjunct => provesCustomToString(conjunct, receiver, ruleContext, true)) &&
      conjuncts.every(
        conjunct =>
          provesCustomToString(conjunct, receiver, ruleContext, true) ||
          provesReceiverToStringIsFunction(conjunct, receiver, ruleContext) ||
          provesReceiverIsObjectLike(conjunct, receiver, ruleContext),
      )
    );
  }

  if (condition.type !== 'BinaryExpression') {
    return false;
  }

  const expectedOperator = positiveBranch ? '!==' : '===';
  return (
    condition.operator === expectedOperator &&
    ((isReceiverToString(condition.left, receiver, ruleContext) &&
      isObjectPrototypeToString(condition.right)) ||
      (isObjectPrototypeToString(condition.left) &&
        isReceiverToString(condition.right, receiver, ruleContext)))
  );
}

/**
 * Allows optional support conjuncts that only prove `receiver.toString` is callable.
 * They are not sufficient on their own because inherited `Object.prototype.toString` is callable too.
 */
function provesReceiverToStringIsFunction(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    condition.type === 'BinaryExpression' &&
    condition.operator === '===' &&
    ((condition.left.type === 'UnaryExpression' &&
      condition.left.operator === 'typeof' &&
      isReceiverToString(condition.left.argument, receiver, ruleContext) &&
      condition.right.type === 'Literal' &&
      condition.right.value === 'function') ||
      (condition.right.type === 'UnaryExpression' &&
        condition.right.operator === 'typeof' &&
        isReceiverToString(condition.right.argument, receiver, ruleContext) &&
        condition.left.type === 'Literal' &&
        condition.left.value === 'function'))
  );
}

/**
 * Allows optional support conjuncts that prove the receiver is object-like before reading
 * `receiver.toString`. These checks support the custom-toString comparison but never suppress alone.
 */
function provesReceiverIsObjectLike(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    condition.type === 'BinaryExpression' &&
    ((condition.operator === '===' &&
      ((condition.left.type === 'UnaryExpression' &&
        condition.left.operator === 'typeof' &&
        areEquivalent(condition.left.argument, receiver, ruleContext.sourceCode) &&
        condition.right.type === 'Literal' &&
        condition.right.value === 'object') ||
        (condition.right.type === 'UnaryExpression' &&
          condition.right.operator === 'typeof' &&
          areEquivalent(condition.right.argument, receiver, ruleContext.sourceCode) &&
          condition.left.type === 'Literal' &&
          condition.left.value === 'object'))) ||
      (condition.operator === '!==' &&
        ((areEquivalent(condition.left, receiver, ruleContext.sourceCode) &&
          condition.right.type === 'Literal' &&
          condition.right.value === null) ||
          (areEquivalent(condition.right, receiver, ruleContext.sourceCode) &&
            condition.left.type === 'Literal' &&
            condition.left.value === null))))
  );
}

/**
 * Matches immediate result validation only:
 *
 *   const result = value.toString();
 *   if (result !== '[object Object]') {
 *     return result; // match
 *   }
 *
 * The result must not be used after the validation or in the rejected branch.
 */
function isValidatedResultCall(
  call: TSESTree.CallExpression,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  const declarator: TSESTree.Node | undefined = call.parent;
  if (
    declarator?.type !== 'VariableDeclarator' ||
    declarator.init !== call ||
    declarator.id.type !== 'Identifier'
  ) {
    return false;
  }

  const resultName = declarator.id.name;
  const declaration: TSESTree.Node | undefined = declarator.parent;
  if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') {
    return false;
  }

  const block: TSESTree.Node | undefined = declaration.parent;
  if (block?.type !== 'BlockStatement') {
    return false;
  }

  const declarationIndex = block.body.indexOf(declaration);
  const validation = block.body[declarationIndex + 1];
  if (
    !isIfStatement(validation) ||
    usesIdentifierAfter(block, declarationIndex + 1, resultName, ruleContext)
  ) {
    return false;
  }

  const acceptedBranch = provesAcceptedResult(validation.test, resultName, true)
    ? validation.consequent
    : undefined;
  const acceptedElseBranch = provesAcceptedResult(validation.test, resultName, false)
    ? validation.alternate
    : undefined;

  if (acceptedBranch) {
    return (
      usesIdentifier(acceptedBranch, resultName, ruleContext) &&
      !usesIdentifier(validation.alternate, resultName, ruleContext)
    );
  }
  return (
    acceptedElseBranch !== undefined &&
    usesIdentifier(acceptedElseBranch, resultName, ruleContext) &&
    !usesIdentifier(validation.consequent, resultName, ruleContext)
  );
}

/**
 * Recognizes the accepted branch of the default-string rejection:
 * `result !== '[object Object]'` accepts the consequent, while
 * `result === '[object Object]'` accepts the else branch.
 */
function provesAcceptedResult(
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
 * Matches non-computed `.toString` reads on the same stable receiver expression.
 * `value.toString` matches for `value`; `value['toString']` and `other.toString` do not.
 */
function isReceiverToString(
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
 * Matches exactly `Object.prototype.toString`, the default implementation the rule warns about.
 */
function isObjectPrototypeToString(node: TSESTree.Node): boolean {
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
 * Limits receiver-guard suppression to single-evaluation receivers.
 * `value` and `this` match; `holder.value` does not because it may invoke a getter on each access.
 */
function isStableReceiver(node: TSESTree.Node): boolean {
  return isIdentifier(node) || node.type === 'ThisExpression';
}

/**
 * Prevents suppressing when a validated result escapes after the guarding `if`.
 */
function usesIdentifierAfter(
  block: TSESTree.BlockStatement,
  statementIndex: number,
  variableName: string,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return block.body
    .slice(statementIndex + 1)
    .some(statement => usesIdentifier(statement, variableName, ruleContext));
}

function usesIdentifier(
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
    usesIdentifier(child as TSESTree.Node, variableName, ruleContext),
  );
}
