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
          !(truthyConjunction && isGuardChain(truthyConjunction, context.sourceCode))
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

/**
 * A conjunction is one cohesive check rather than independent conditions when an operand checks
 * the existence, type, or shape of a reference and every operand only uses that same reference.
 */
function isGuardChain(expression: estree.LogicalExpression, sourceCode: SourceCode) {
  const operands = flattenConjunction(expression);
  return operands
    .flatMap(getCheckedSubjects)
    .some(subject => operands.every(operand => mentions(operand, subject, sourceCode)));
}

function flattenConjunction(expression: estree.Expression): estree.Expression[] {
  if (expression.type === 'LogicalExpression' && expression.operator === '&&') {
    return [...flattenConjunction(expression.left), ...flattenConjunction(expression.right)];
  }
  return [expression];
}

/**
 * Returns the references whose existence, type, or shape the operand checks. Comparing a property
 * checks that property, not the object holding it, so `result.kind === 'success'` checks nothing
 * about `result`.
 */
function getCheckedSubjects(operand: estree.Expression): StableReference[] {
  if (isStableReference(operand)) {
    return [operand];
  }
  if (operand.type === 'CallExpression' && operand.arguments.length === 1) {
    const [argument] = operand.arguments;
    return isStableReference(argument) ? [argument] : [];
  }
  return operand.type === 'BinaryExpression' ? getComparisonSubjects(operand) : [];
}

function getComparisonSubjects({
  left,
  operator,
  right,
}: estree.BinaryExpression): StableReference[] {
  switch (operator) {
    case 'instanceof':
      return isStableReference(left) ? [left] : [];
    case 'in':
      return isStringLiteral(left) && isStableReference(right) ? [right] : [];
    case '!=':
    case '!==':
      return getDefinedSubjects(left, right);
    case '==':
    case '===':
      return getTypeofSubjects(left, right);
    default:
      return [];
  }
}

function getDefinedSubjects(
  left: estree.Expression | estree.PrivateIdentifier,
  right: estree.Expression | estree.PrivateIdentifier,
): StableReference[] {
  if (isAbsentValue(left) && isStableReference(right)) {
    return [right];
  }
  if (isAbsentValue(right) && isStableReference(left)) {
    return [left];
  }
  return [];
}

function getTypeofSubjects(
  left: estree.Expression | estree.PrivateIdentifier,
  right: estree.Expression,
): StableReference[] {
  const subject = getTypeofSubject(left, right) ?? getTypeofSubject(right, left);
  return subject ? [subject] : [];
}

function getTypeofSubject(
  candidateTypeof: estree.Expression | estree.PrivateIdentifier,
  candidateLiteral: estree.Expression | estree.PrivateIdentifier,
) {
  return candidateTypeof.type === 'UnaryExpression' &&
    candidateTypeof.operator === 'typeof' &&
    isStringLiteral(candidateLiteral) &&
    isStableReference(candidateTypeof.argument)
    ? candidateTypeof.argument
    : undefined;
}

function isStringLiteral(node: estree.Node): node is estree.Literal {
  return node.type === 'Literal' && typeof node.value === 'string';
}

function isAbsentValue(node: estree.Node) {
  return isNullLiteral(node) || isUndefined(node);
}

/**
 * Whether the expression uses the subject. Nested functions are skipped because they can shadow
 * the reference, in which case a match would denote a different value.
 */
function mentions(node: estree.Node, subject: estree.Expression, sourceCode: SourceCode): boolean {
  if (
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'ClassExpression'
  ) {
    return false;
  }
  if (areEquivalent(node, subject, sourceCode)) {
    return true;
  }
  // A non-computed property name is not a reference, so `b.a` does not use `a`.
  const children =
    node.type === 'MemberExpression' && !node.computed
      ? [node.object]
      : childrenOf(node, sourceCode.visitorKeys);
  return children.some(child => mentions(child, subject, sourceCode));
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
