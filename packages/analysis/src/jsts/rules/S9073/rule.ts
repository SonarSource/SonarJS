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
// https://sonarsource.github.io/rspec/#/rspec/S9073/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { isNullLiteral, isUndefined } from '../helpers/ast.js';
import { extractTestAssertion } from '../helpers/assertions.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  issue:
    'This composite assertion hides which condition failed; split it to make failures actionable.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const assertion = extractTestAssertion(context, node);
        if (
          assertion?.kind !== 'predicate' ||
          (assertion.style !== 'node-assert' && assertion.style !== 'jest-like') ||
          (assertion.predicate !== 'truthy' && assertion.predicate !== 'falsy')
        ) {
          return;
        }

        const isTruthy = (assertion.predicate === 'truthy') !== assertion.negated;
        const actual = assertion.actual;
        const truthyConjunction = getTruthyConjunction(actual, isTruthy);
        const isComposite =
          (isTruthy &&
            ((actual.type === 'LogicalExpression' && actual.operator === '&&') ||
              (actual.type === 'UnaryExpression' &&
                actual.operator === '!' &&
                actual.argument.type === 'LogicalExpression' &&
                actual.argument.operator === '||'))) ||
          (!isTruthy &&
            ((actual.type === 'LogicalExpression' && actual.operator === '||') ||
              (actual.type === 'UnaryExpression' &&
                actual.operator === '!' &&
                actual.argument.type === 'LogicalExpression' &&
                actual.argument.operator === '&&')));

        if (
          isComposite &&
          (!truthyConjunction || !isAssertionGuardChain(truthyConjunction, context.sourceCode))
        ) {
          context.report({ node: actual, messageId: 'issue' });
        }
      },
    };
  },
};

function getTruthyConjunction(
  actual: estree.Node,
  isTruthy: boolean,
): estree.LogicalExpression | undefined {
  if (isTruthy && actual.type === 'LogicalExpression' && actual.operator === '&&') {
    return actual;
  }
  if (
    !isTruthy &&
    actual.type === 'UnaryExpression' &&
    actual.operator === '!' &&
    actual.argument.type === 'LogicalExpression' &&
    actual.argument.operator === '&&'
  ) {
    return actual.argument;
  }
  return undefined;
}

function isAssertionGuardChain(expression: estree.LogicalExpression, sourceCode: SourceCode) {
  const operands = flattenConjunction(expression);
  const subjects = operands.flatMap(getGuardSubjects).filter(isStableReference);
  return subjects.some(
    subject =>
      hasSafeObjectGuard(subject, operands, sourceCode) &&
      operands.every(operand => participatesInGuard(operand, subject, sourceCode)),
  );
}

function flattenConjunction(expression: estree.Expression): estree.Expression[] {
  if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
    return [...flattenConjunction(expression.left), ...flattenConjunction(expression.right)];
  }
  return [expression];
}

function getGuardSubjects(expression: estree.Expression): estree.Expression[] {
  if (isStableReference(expression)) {
    return [expression];
  }
  if (expression.type === 'CallExpression' && isTypePredicateCall(expression)) {
    return [expression.arguments[0] as estree.Expression];
  }
  if (expression.type !== 'BinaryExpression') {
    return [];
  }

  const { left, operator, right } = expression;
  if (operator === 'instanceof' && isStableReference(left)) {
    return [left];
  }
  if (
    operator === 'in' &&
    left.type === 'Literal' &&
    typeof left.value === 'string' &&
    isStableReference(right)
  ) {
    return [right];
  }
  if (operator === '!=' || operator === '!==') {
    if (isAbsentValue(left) && isStableReference(right)) {
      return [right];
    }
    if (isAbsentValue(right) && isStableReference(left)) {
      return [left];
    }
  }
  if (operator === '==' || operator === '===') {
    const typeofSubject = getPositiveTypeofSubject(left, right);
    if (typeofSubject) {
      return [typeofSubject];
    }
    const discriminatedSubject = getDiscriminatedSubject(left, right);
    if (discriminatedSubject) {
      return [discriminatedSubject];
    }
  }
  return [];
}

function getPositiveTypeofSubject(
  left: estree.Expression | estree.PrivateIdentifier,
  right: estree.Expression,
) {
  if (
    left.type === 'UnaryExpression' &&
    left.operator === 'typeof' &&
    right.type === 'Literal' &&
    typeof right.value === 'string' &&
    right.value !== 'undefined' &&
    isStableReference(left.argument)
  ) {
    return left.argument;
  }
  if (
    right.type === 'UnaryExpression' &&
    right.operator === 'typeof' &&
    left.type === 'Literal' &&
    typeof left.value === 'string' &&
    left.value !== 'undefined' &&
    isStableReference(right.argument)
  ) {
    return right.argument;
  }
  return undefined;
}

function getDiscriminatedSubject(
  left: estree.Expression | estree.PrivateIdentifier,
  right: estree.Expression,
) {
  if (left.type === 'MemberExpression' && isPositiveLiteral(right)) {
    return isStableReference(left.object) ? left.object : undefined;
  }
  if (right.type === 'MemberExpression' && isPositiveLiteral(left)) {
    return isStableReference(right.object) ? right.object : undefined;
  }
  return undefined;
}

function isPositiveLiteral(node: estree.Node) {
  return node.type === 'Literal' && ['string', 'number'].includes(typeof node.value);
}

function isAbsentValue(node: estree.Node) {
  return isNullLiteral(node) || isUndefined(node);
}

function isTypePredicateCall(
  expression: estree.CallExpression,
): expression is estree.CallExpression & { arguments: [estree.Expression] } {
  if (expression.arguments.length !== 1 || expression.arguments[0].type === 'SpreadElement') {
    return false;
  }
  const { callee } = expression;
  return (
    (callee.type === 'Identifier' && /^is[A-Z_]/u.test(callee.name)) ||
    (callee.type === 'MemberExpression' &&
      !callee.computed &&
      callee.object.type === 'Identifier' &&
      callee.object.name === 'Array' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'isArray')
  );
}

function participatesInGuard(
  operand: estree.Expression,
  subject: estree.Expression,
  sourceCode: SourceCode,
) {
  return (
    areEquivalent(operand, subject, sourceCode) ||
    getGuardSubjects(operand).some(candidate => areEquivalent(candidate, subject, sourceCode)) ||
    containsMemberAccessOn(operand, subject, sourceCode)
  );
}

function hasSafeObjectGuard(
  subject: estree.Expression,
  operands: estree.Expression[],
  sourceCode: SourceCode,
) {
  const hasObjectTypeof = operands.some(operand =>
    isPositiveTypeofComparison(operand, subject, 'object', sourceCode),
  );
  return (
    !hasObjectTypeof ||
    operands.some(operand => areEquivalent(operand, subject, sourceCode)) ||
    operands.some(operand => isNonNullComparison(operand, subject, sourceCode))
  );
}

function isPositiveTypeofComparison(
  expression: estree.Expression,
  subject: estree.Expression,
  typeName: string,
  sourceCode: SourceCode,
) {
  if (
    expression.type !== 'BinaryExpression' ||
    (expression.operator !== '==' && expression.operator !== '===')
  ) {
    return false;
  }
  const pairs = [
    [expression.left, expression.right],
    [expression.right, expression.left],
  ] as const;
  return pairs.some(
    ([candidateTypeof, candidateLiteral]) =>
      candidateTypeof.type === 'UnaryExpression' &&
      candidateTypeof.operator === 'typeof' &&
      candidateLiteral.type === 'Literal' &&
      candidateLiteral.value === typeName &&
      areEquivalent(candidateTypeof.argument, subject, sourceCode),
  );
}

function isNonNullComparison(
  expression: estree.Expression,
  subject: estree.Expression,
  sourceCode: SourceCode,
) {
  if (
    expression.type !== 'BinaryExpression' ||
    (expression.operator !== '!=' && expression.operator !== '!==')
  ) {
    return false;
  }
  return (
    (isNullLiteral(expression.left) && areEquivalent(expression.right, subject, sourceCode)) ||
    (isNullLiteral(expression.right) && areEquivalent(expression.left, subject, sourceCode))
  );
}

function containsMemberAccessOn(
  node: estree.Node,
  subject: estree.Expression,
  sourceCode: SourceCode,
): boolean {
  if (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'ClassExpression'
  ) {
    return false;
  }
  if (
    node.type === 'MemberExpression' &&
    isStableReference(node.object) &&
    areEquivalent(node.object, subject, sourceCode)
  ) {
    return true;
  }
  return childrenOf(node, sourceCode.visitorKeys).some(child =>
    containsMemberAccessOn(child, subject, sourceCode),
  );
}

type StableReference = estree.Identifier | estree.ThisExpression | estree.MemberExpression;

function isStableReference(node: estree.Node): node is StableReference {
  if (node.type === 'Identifier' || node.type === 'ThisExpression') {
    return true;
  }
  if (node.type !== 'MemberExpression' || !isStableReference(node.object)) {
    return false;
  }
  return (
    (!node.computed &&
      (node.property.type === 'Identifier' || node.property.type === 'PrivateIdentifier')) ||
    (node.computed && node.property.type === 'Literal')
  );
}
