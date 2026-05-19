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
// https://sonarsource.github.io/rspec/#/rspec/S6551/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isGenericType } from '../helpers/type.js';
import { childrenOf } from '../helpers/ancestor.js';
import { isCallingMethod, isIdentifier, isIfStatement } from '../helpers/ast.js';
import { areEquivalent } from '../helpers/equivalence.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const services = context.sourceCode.parserServices;
        const node = reportDescriptor.node as TSESTree.Node;
        if (
          isGenericType(node, services) ||
          isGuardedDirectToStringCall(reportDescriptor, context)
        ) {
          // we skip
        } else {
          context.report(reportDescriptor);
        }
      }
    },
  );
}

function isGuardedDirectToStringCall(
  reportDescriptor: Rule.ReportDescriptor,
  context: Rule.RuleContext,
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
    (isGuardedReceiverCall(call, context) || isValidatedResultCall(call, context))
  );
}

function getReportedToStringCall(node: TSESTree.Node): TSESTree.CallExpression | undefined {
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

function isGuardedReceiverCall(call: TSESTree.CallExpression, context: Rule.RuleContext): boolean {
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
        provesCustomToString(parent.test, receiver, context, true)
      ) {
        return true;
      }
      if (
        parent.alternate === current &&
        isCallInFirstStatementOfBranch(call, parent.alternate) &&
        provesCustomToString(parent.test, receiver, context, false)
      ) {
        return true;
      }
    }
    if (isFunctionBoundary(parent)) {
      break;
    }
    current = parent;
  }
  return false;
}

function isCallInFirstStatementOfBranch(
  call: TSESTree.CallExpression,
  branch: TSESTree.Statement | null,
): boolean {
  if (!branch) {
    return false;
  }

  const firstStatement = branch.type === 'BlockStatement' ? branch.body[0] : branch;
  return firstStatement !== undefined && isAncestorOrSelf(firstStatement, call);
}

function isAncestorOrSelf(ancestor: TSESTree.Node, node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    if (isFunctionBoundary(current)) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function provesCustomToString(
  condition: TSESTree.Expression,
  receiver: TSESTree.Expression,
  context: Rule.RuleContext,
  positiveBranch: boolean,
): boolean {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&' && positiveBranch) {
    return (
      provesCustomToString(condition.left, receiver, context, positiveBranch) ||
      provesCustomToString(condition.right, receiver, context, positiveBranch)
    );
  }

  if (condition.type !== 'BinaryExpression') {
    return false;
  }

  const expectedOperator = positiveBranch ? '!==' : '===';
  return (
    condition.operator === expectedOperator &&
    ((isReceiverToString(condition.left, receiver, context) &&
      isObjectPrototypeToString(condition.right)) ||
      (isObjectPrototypeToString(condition.left) &&
        isReceiverToString(condition.right, receiver, context)))
  );
}

function isValidatedResultCall(call: TSESTree.CallExpression, context: Rule.RuleContext): boolean {
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
    usesIdentifierAfter(block, declarationIndex + 1, resultName, context)
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
      usesIdentifier(acceptedBranch, resultName, context) &&
      !usesIdentifier(validation.alternate, resultName, context)
    );
  }
  return (
    acceptedElseBranch !== undefined &&
    usesIdentifier(acceptedElseBranch, resultName, context) &&
    !usesIdentifier(validation.consequent, resultName, context)
  );
}

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

function isReceiverToString(
  node: TSESTree.Node,
  receiver: TSESTree.Expression,
  context: Rule.RuleContext,
): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.property, 'toString') &&
    areEquivalent(node.object as estree.Node, receiver as estree.Node, context.sourceCode)
  );
}

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

function isStableReceiver(node: TSESTree.Node): boolean {
  return (
    isIdentifier(node) ||
    (node.type === 'MemberExpression' &&
      !node.computed &&
      isIdentifier(node.property) &&
      isStableReceiver(node.object))
  );
}

function usesIdentifierAfter(
  block: TSESTree.BlockStatement,
  statementIndex: number,
  variableName: string,
  context: Rule.RuleContext,
): boolean {
  return block.body
    .slice(statementIndex + 1)
    .some(statement => usesIdentifier(statement, variableName, context));
}

function usesIdentifier(
  node: TSESTree.Node | null | undefined,
  variableName: string,
  context: Rule.RuleContext,
): boolean {
  if (!node) {
    return false;
  }
  if (isIdentifier(node, variableName)) {
    return true;
  }
  return childrenOf(node as estree.Node, context.sourceCode.visitorKeys).some(child =>
    usesIdentifier(child as TSESTree.Node, variableName, context),
  );
}

function isFunctionBoundary(node: TSESTree.Node): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}
