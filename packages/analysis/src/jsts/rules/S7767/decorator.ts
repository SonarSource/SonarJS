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
import { isNumberLiteral, unwrapTypeScriptExpression } from '../helpers/ast.js';
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
 *
 * The coerced expression still has to be able to leave the int32 range. Whatever already yields
 * an int32 on its own - a bitwise operator, `~`, or a lone `Math.imul` call - keeps the coercion
 * around it redundant, however its operands were computed.
 *
 * `Math.imul` only marks the intent. Hashes that wrap without it, such as
 * `hash = ((hash << 5) - hash + c) | 0`, stay reported; widening to those needs its own analysis.
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

/** Bitwise operators, which always evaluate to an int32. `>>>` is left out: it yields a uint32. */
const INT32_BINARY_OPERATORS = new Set(['&', '|', '^', '<<', '>>']);

/**
 * Operators to look through when hunting for an `imul` below the coerced expression. Descending
 * through the bitwise ones does not track a value - they erase their operands' provenance - it
 * only tells us that 32-bit arithmetic was intended somewhere in the subtree.
 */
const ARITHMETIC_BINARY_OPERATORS = new Set([
  ...INT32_BINARY_OPERATORS,
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '>>>',
]);
const ARITHMETIC_UNARY_OPERATORS = new Set(['+', '-', '~']);

function wrapsDeliberate32BitArithmetic(node: estree.Node, context: Rule.RuleContext): boolean {
  const coerced = getCoercedOperand(node);
  return (
    coerced !== undefined && !yieldsInt32(coerced, context) && containsMathImul(coerced, context)
  );
}

/** Whether the expression is an int32 already, which makes the coercion around it redundant. */
function yieldsInt32(node: estree.Node, context: Rule.RuleContext): boolean {
  const expression = unwrapTypeScriptExpression(node);
  if (expression.type === 'BinaryExpression') {
    return INT32_BINARY_OPERATORS.has(expression.operator);
  }
  if (expression.type === 'UnaryExpression') {
    // `~x` is an int32 and `+x` passes its operand through, but `-x` can take -2^31 out of range.
    return (
      expression.operator === '~' ||
      (expression.operator === '+' && yieldsInt32(expression.argument, context))
    );
  }
  return isMathImul(expression, context);
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
  const expression = unwrapTypeScriptExpression(node);
  if (
    expression.type === 'BinaryExpression' &&
    ARITHMETIC_BINARY_OPERATORS.has(expression.operator)
  ) {
    return (
      containsMathImul(expression.left, context) || containsMathImul(expression.right, context)
    );
  }
  if (
    expression.type === 'UnaryExpression' &&
    ARITHMETIC_UNARY_OPERATORS.has(expression.operator)
  ) {
    return containsMathImul(expression.argument, context);
  }
  return isMathImul(expression, context);
}

/** A call to the global `Math.imul`, including the `ChainExpression` that `?.` parses into. */
function isMathImul(node: estree.Node, context: Rule.RuleContext): boolean {
  const call = node.type === 'ChainExpression' ? node.expression : node;
  return call.type === 'CallExpression' && getFullyQualifiedName(context, call) === 'Math.imul';
}
