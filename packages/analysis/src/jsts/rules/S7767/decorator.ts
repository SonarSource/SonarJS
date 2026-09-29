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
import {
  getVariableFromName,
  hasParent,
  isNumberLiteral,
  unwrapTypeScriptExpression,
} from '../helpers/ast.js';
import { childrenOf } from '../helpers/ancestor.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName, isGlobalShadowed } from '../helpers/module.js';
import * as meta from './generated-meta.js';

/**
 * The operators the rule reports all coerce through ToInt32: `x << 0`, `x >> 0`, `x | 0`,
 * `x ^ 0` and `~~x` truncate *and* wrap to a signed 32-bit integer, while `Math.trunc` only
 * truncates. The two are interchangeable only as long as the operand stays in the int32 range.
 *
 * The exemption is scoped to the one shape where the wrap is provably deliberate: a hash update
 * that feeds an accumulator back through `Math.imul` and writes the coerced result to that same
 * accumulator, as in `hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0`. `Math.imul` returns an
 * int32, so the surrounding arithmetic is 32-bit by construction and can overflow again - which
 * is exactly what the coercion is there to wrap. `Math.trunc` would silently change the hash.
 *
 * Three conditions therefore all have to hold:
 *
 * 1. The coerced expression can leave the int32 range. Whatever already yields an int32 on its
 *    own - a bitwise operator, `~`, or a lone `Math.imul` call - keeps the coercion redundant.
 * 2. A `Math.imul` call reachable through arithmetic reads the accumulator.
 * 3. The coercion is written straight back to that accumulator.
 *
 * A bare `(Math.imul(31, hash) + c) << 0` that is not written back proves nothing about intent,
 * so it stays reported. Hashes that wrap without `Math.imul`, such as
 * `hash = ((hash << 5) - hash + c) | 0`, stay reported too; widening to those needs its own
 * analysis.
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

/** Whether a node is a read of the accumulator the coercion writes back to. */
type ReadsAccumulator = (node: estree.Node) => boolean;

function wrapsDeliberate32BitArithmetic(node: estree.Node, context: Rule.RuleContext): boolean {
  const coerced = getCoercedOperand(node);
  if (coerced === undefined || yieldsInt32(coerced, context)) {
    return false;
  }
  const readsAccumulator = getAccumulatorTest(node, context);
  return readsAccumulator !== undefined && updatesAccumulator(coerced, readsAccumulator, context);
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
  return asMathImulCall(expression, context) !== undefined;
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

/**
 * Recognises the accumulator a reported coercion is written back to, as `hash` in
 * `hash = (...) | 0` or `this.hash` in `this.hash = (...) | 0`. Returns `undefined` when the
 * coercion is not the whole right-hand side of a plain assignment, which is every case where
 * there is no accumulator to speak of.
 */
function getAccumulatorTest(
  node: estree.Node,
  context: Rule.RuleContext,
): ReadsAccumulator | undefined {
  const parent = hasParent(node) ? node.parent : undefined;
  if (parent?.type !== 'AssignmentExpression' || parent.operator !== '=') {
    return undefined;
  }
  const target = parent.left;
  if (target.type === 'Identifier') {
    // Compare bindings rather than names, so an inner `hash` shadowing the assigned one does
    // not pass for it. An unresolved target - a global, say - can only be matched by name.
    const variable = getVariableFromName(context, target.name, target);
    return candidate =>
      candidate.type === 'Identifier' &&
      candidate.name === target.name &&
      (variable === undefined ||
        getVariableFromName(context, candidate.name, candidate) === variable);
  }
  if (target.type === 'MemberExpression') {
    // Property chains have no binding to compare, so fall back on how they are spelled.
    const text = context.sourceCode.getText(target);
    return candidate =>
      candidate.type === 'MemberExpression' && context.sourceCode.getText(candidate) === text;
  }
  return undefined;
}

/** Whether a `Math.imul` call reachable through arithmetic reads the accumulator. */
function updatesAccumulator(
  node: estree.Node,
  readsAccumulator: ReadsAccumulator,
  context: Rule.RuleContext,
): boolean {
  const expression = unwrapTypeScriptExpression(node);
  if (
    expression.type === 'BinaryExpression' &&
    ARITHMETIC_BINARY_OPERATORS.has(expression.operator)
  ) {
    return (
      updatesAccumulator(expression.left, readsAccumulator, context) ||
      updatesAccumulator(expression.right, readsAccumulator, context)
    );
  }
  if (
    expression.type === 'UnaryExpression' &&
    ARITHMETIC_UNARY_OPERATORS.has(expression.operator)
  ) {
    return updatesAccumulator(expression.argument, readsAccumulator, context);
  }
  const call = asMathImulCall(expression, context);
  return (
    call !== undefined &&
    call.arguments.some(argument => contains(argument, readsAccumulator, context))
  );
}

function contains(
  node: estree.Node,
  predicate: ReadsAccumulator,
  context: Rule.RuleContext,
): boolean {
  return (
    predicate(node) ||
    childrenOf(node, context.sourceCode.visitorKeys).some(child =>
      contains(child, predicate, context),
    )
  );
}

/**
 * The call if it invokes the built-in `Math.imul`, including the `ChainExpression` that `?.`
 * parses into. A local `Math` - imported, declared or a parameter - carries no int32 guarantee,
 * so a shadowed global disqualifies the call even when the name resolves to `Math.imul`.
 */
function asMathImulCall(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.CallExpression | undefined {
  const call = node.type === 'ChainExpression' ? node.expression : node;
  if (call.type !== 'CallExpression' || getFullyQualifiedName(context, call) !== 'Math.imul') {
    return undefined;
  }
  return isGlobalShadowed(context.sourceCode, call, 'Math') ? undefined : call;
}
