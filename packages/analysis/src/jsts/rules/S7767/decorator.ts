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
import type { Rule } from 'eslint';
import type estree from 'estree';
import { isNumberLiteral } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

/**
 * The operators the rule reports all coerce through ToInt32: `x << 0`, `x >> 0`, `x | 0`,
 * `x ^ 0` and `~~x` truncate *and* wrap to a signed 32-bit integer, while `Math.trunc` only
 * truncates. The two are interchangeable only as long as the operand stays in the int32 range.
 *
 * `Math.imul` returns an int32, so an expression combining its result with something else is
 * deliberate 32-bit arithmetic that can overflow again - which is exactly what the coercion is
 * there to wrap. Replacing it with `Math.trunc` would silently change the computed value, as in
 * the classic string hash `hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0`.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      if ('node' in descriptor && wrapsDeliberate32BitArithmetic(descriptor.node, context)) {
        return;
      }
      context.report(descriptor);
    },
  );
}

/** Binary operators that the rule reports when applied to `0`. */
const COERCING_OPERATORS = new Set(['<<', '>>', '|', '^']);

/** Operators that keep composing numbers, so an `imul` result can still reach the coercion. */
const ARITHMETIC_BINARY_OPERATORS = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '&',
  '|',
  '^',
  '<<',
  '>>',
  '>>>',
]);
const ARITHMETIC_UNARY_OPERATORS = new Set(['+', '-', '~']);

function wrapsDeliberate32BitArithmetic(node: estree.Node, context: Rule.RuleContext): boolean {
  const coerced = getCoercedOperand(node);
  // A lone `Math.imul(...)` is already an int32, so coercing it really is redundant.
  return (
    coerced?.type === 'BinaryExpression' &&
    ARITHMETIC_BINARY_OPERATORS.has(coerced.operator) &&
    containsMathImul(coerced, context)
  );
}

/** The value the reported node coerces to int32, or `undefined` if there is no single one. */
function getCoercedOperand(node: estree.Node): estree.Node | undefined {
  if (
    node.type === 'BinaryExpression' &&
    COERCING_OPERATORS.has(node.operator) &&
    isNumberLiteral(node.right) &&
    node.right.value === 0
  ) {
    return node.left;
  }
  // `~~x`, reported on the outer bitwise NOT. Compound assignments such as `x |= 0` are left
  // out on purpose: their left-hand side is an assignment target, never an arithmetic expression.
  if (isBitwiseNot(node) && isBitwiseNot(node.argument)) {
    return node.argument.argument;
  }
  return undefined;
}

function isBitwiseNot(node: estree.Node): node is estree.UnaryExpression {
  return node.type === 'UnaryExpression' && node.operator === '~';
}

function containsMathImul(node: estree.Node, context: Rule.RuleContext): boolean {
  if (node.type === 'BinaryExpression' && ARITHMETIC_BINARY_OPERATORS.has(node.operator)) {
    return containsMathImul(node.left, context) || containsMathImul(node.right, context);
  }
  if (node.type === 'UnaryExpression' && ARITHMETIC_UNARY_OPERATORS.has(node.operator)) {
    return containsMathImul(node.argument, context);
  }
  return node.type === 'CallExpression' && getFullyQualifiedName(context, node) === 'Math.imul';
}
