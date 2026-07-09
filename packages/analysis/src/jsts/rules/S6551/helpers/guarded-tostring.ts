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
import { isFunctionNode, isIfStatement } from '../../helpers/ast.js';
import {
  getReportedToStringCall,
  isCallInFirstStatementOfBranch,
  isStableReceiver,
  provesAcceptedResult,
  provesCustomToString,
  usesIdentifier,
  usesIdentifierAfter,
} from './ast.js';

/**
 * S6551 suppresses only the two direct-call shapes that have an explicit runtime safety check:
 *
 *   if (value.toString !== Object.prototype.toString) {
 *     return value.toString();
 *   }
 *
 *   const rendered = value.toString();
 *   if (rendered !== '[object Object]') {
 *     return rendered;
 *   }
 *
 * Nearby shapes still report, for example when another statement runs first or when the
 * validated result is reused later.
 */
export function isGuardedDirectToStringCall(
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
        provesCustomToString(parent.test, receiver, context.sourceCode, true)
      ) {
        return true;
      }
      if (
        parent.alternate === current &&
        isCallInFirstStatementOfBranch(call, parent.alternate) &&
        provesCustomToString(parent.test, receiver, context.sourceCode, false)
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
 * Accepted shape:
 *
 *   const rendered = value.toString();
 *   if (rendered !== '[object Object]') {
 *     return rendered;
 *   }
 *
 * Also accepted:
 *
 *   const rendered = value.toString();
 *   if (rendered === '[object Object]') {
 *     return fallback;
 *   } else {
 *     return rendered;
 *   }
 *
 * Rejected shape:
 *
 *   const rendered = value.toString();
 *   if (rendered !== '[object Object]') {
 *     return rendered;
 *   }
 *   log(rendered);
 *
 * Why S6551 cares: the captured result must be validated immediately, used only in the accepted
 * branch, and not escape afterward.
 */
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
    usesIdentifierAfter(block, declarationIndex + 1, resultName, context.sourceCode)
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
      usesIdentifier(acceptedBranch, resultName, context.sourceCode) &&
      !usesIdentifier(validation.alternate, resultName, context.sourceCode)
    );
  }
  return (
    acceptedElseBranch !== undefined &&
    usesIdentifier(acceptedElseBranch, resultName, context.sourceCode) &&
    !usesIdentifier(validation.consequent, resultName, context.sourceCode)
  );
}
