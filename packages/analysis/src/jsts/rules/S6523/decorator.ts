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
// https://sonarsource.github.io/rspec/#/rspec/S6523/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { isArrayExpression, unwrapTypeScriptExpression } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

/**
 * The rule reports an optional chain whose result is consumed where `undefined` would throw - a
 * spread element, a `for...of` right-hand side, a `new` callee, an `instanceof` operand, and so on.
 * Upstream reports every such chain without asking whether it can actually be `undefined`.
 *
 * The exemption is scoped to the one shape whose value is provably not `undefined`: an
 * `Array.prototype` method call on an array literal reached through a `??` or `||` fallback, as in
 * `[...(comments ?? [])?.filter(isOwn)]`. Three conditions all have to hold:
 *
 * 1. The chain is a non-optional call of an optional, non-computed member. That pins it to a single
 *    optional link, because the receiver below it has to be an array literal.
 * 2. The member names an `Array.prototype` method that can never return `undefined`. Proving the
 *    method merely exists is not enough: `forEach` returns `undefined`, and `pop`, `shift`, `at`,
 *    `find` and `reduce` all may.
 * 3. The receiver reduces to an array literal once TypeScript wrappers are stripped and `??` / `||`
 *    fallbacks are peeled, so the optional link cannot short-circuit.
 *
 * Everything else keeps reporting: a plain `a?.filter(f)`, a fallback that is an identifier, a call,
 * `null`, `{}` or `new Array()`, a second optional link such as `(a ?? [])?.filter(f)?.map(g)`, a
 * computed or uncalled member, and any method whose return value is not proven.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, reportDescriptor) => {
      // Both upstream report sites pass the `ChainExpression`; the type check is a safety net.
      if (
        'node' in reportDescriptor &&
        reportDescriptor.node.type === 'ChainExpression' &&
        isGuardedArrayMethodCall(reportDescriptor.node)
      ) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

/**
 * `Array.prototype` methods specified to return a freshly created Array - or, for `join`, a
 * String. None of them can return `undefined` for any receiver, an empty array included - this
 * assumes an intact, unmodified `Array.prototype`; a monkey-patched or replaced method is out of
 * scope, as it is for every other rule in this repo that reasons about builtins.
 */
const ARRAY_METHODS_NEVER_UNDEFINED = new Set([
  'concat',
  'filter',
  'flat',
  'flatMap',
  'join',
  'map',
  'slice',
  'toReversed',
  'toSorted',
  'toSpliced',
  'with',
]);

/** Whether the chain is an `Array.prototype` method call on a receiver proven to be an array. */
function isGuardedArrayMethodCall(chain: estree.ChainExpression): boolean {
  const call = unwrapTypeScriptExpression(chain.expression);
  if (call.type !== 'CallExpression' || call.optional) {
    return false;
  }
  const callee = unwrapTypeScriptExpression(call.callee);
  return (
    callee.type === 'MemberExpression' &&
    callee.optional &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    ARRAY_METHODS_NEVER_UNDEFINED.has(callee.property.name) &&
    isArrayFallback(callee.object)
  );
}

/** Whether the value reaching the optional link is an array literal, fallbacks peeled. */
function isArrayFallback(node: estree.Expression | estree.Super): boolean {
  let expression = unwrapTypeScriptExpression(node);
  // `a ?? F` yields `a` only when `a` is not nullish; `a || F` only when `a` is truthy.
  // Either way the value is `F` or a non-nullish `a`, so the fallback is what has to be proven.
  while (
    expression.type === 'LogicalExpression' &&
    (expression.operator === '??' || expression.operator === '||')
  ) {
    expression = unwrapTypeScriptExpression(expression.right);
  }
  return isArrayExpression(expression);
}
