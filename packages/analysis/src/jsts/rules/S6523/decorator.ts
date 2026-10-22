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
import { isStrictCompilerOptionEnabled } from 'ts-api-utils';
import { isArrayExpression, unwrapTypeScriptExpression } from '../helpers/ast.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import {
  getSymbolAtLocation,
  getTypeFromTreeNode,
  isNullOrUndefinedType,
} from '../helpers/type.js';
import * as meta from './generated-meta.js';

/**
 * The rule reports an optional chain whose result is consumed where `undefined` would throw - a
 * spread element, a `for...of` right-hand side, a `new` callee, an `instanceof` operand, and so on.
 * Upstream reports every such chain without asking whether it can actually be `undefined`.
 *
 * The exemption is scoped to an `Array.prototype` method call whose value is provably not
 * `undefined`, as in `[...(comments ?? [])?.filter(isOwn)]` or `parts?.values()` after a nullish
 * guard. Three conditions all have to hold:
 *
 * 1. The chain is a non-optional call of an optional, non-computed member. That pins it to a single
 *    optional link, because the receiver below it has to be non-nullish.
 * 2. The member names an `Array.prototype` method that can never return `undefined`. Proving the
 *    method merely exists is not enough: `forEach` returns `undefined`, and `pop`, `shift`, `at`,
 *    `find` and `reduce` all may.
 * 3. The receiver reduces to an array literal once TypeScript wrappers are stripped and `??` / `||`
 *    fallbacks are peeled, or it is an identifier whose nullable declared type is narrowed to an
 *    array with strict null checks enabled. Index accesses and type assertions alone do not prove
 *    that the receiver is non-nullish.
 *
 * Everything else keeps reporting, including nullable or unknown receivers, a second optional
 * link such as `parts?.filter(f)?.map(g)`, computed or uncalled members, and methods whose return
 * value is not proven.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, reportDescriptor) => {
      // Both upstream report sites pass the `ChainExpression`; the type check is a safety net.
      if (
        'node' in reportDescriptor &&
        reportDescriptor.node.type === 'ChainExpression' &&
        isGuardedArrayMethodCall(reportDescriptor.node, context)
      ) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

/**
 * `Array.prototype` methods specified to return an Array, a String, or an iterator.
 * None of them can return `undefined` for any receiver, an empty array included - this
 * assumes an intact, unmodified `Array.prototype`; a monkey-patched or replaced method is out of
 * scope, as it is for every other rule in this repo that reasons about builtins.
 */
const ARRAY_METHODS_NEVER_UNDEFINED = new Set([
  'concat',
  'entries',
  'filter',
  'flat',
  'flatMap',
  'join',
  'keys',
  'map',
  'slice',
  'toReversed',
  'toSorted',
  'toSpliced',
  'values',
  'with',
]);

/** Whether the chain is an `Array.prototype` method call on a receiver proven to be an array. */
function isGuardedArrayMethodCall(
  chain: estree.ChainExpression,
  context: Rule.RuleContext,
): boolean {
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
    isArrayReceiver(callee.object, context)
  );
}

/** Whether the value reaching the optional link is a non-nullish array, fallbacks peeled. */
function isArrayReceiver(
  node: estree.Expression | estree.Super,
  context: Rule.RuleContext,
): boolean {
  let expression = unwrapTypeScriptExpression(node);
  // `a ?? F` yields `a` only when `a` is not nullish; `a || F` only when `a` is truthy.
  // Either way the value is `F` or a non-nullish `a`, so the fallback is what has to be proven.
  while (
    expression.type === 'LogicalExpression' &&
    (expression.operator === '??' || expression.operator === '||')
  ) {
    expression = unwrapTypeScriptExpression(expression.right);
  }
  if (isArrayExpression(expression)) {
    return true;
  }
  const services = context.sourceCode.parserServices;
  if (
    expression.type !== 'Identifier' ||
    !isRequiredParserServices(services) ||
    !isStrictCompilerOptionEnabled(services.program.getCompilerOptions(), 'strictNullChecks')
  ) {
    return false;
  }
  const checker = services.program.getTypeChecker();
  const symbol = getSymbolAtLocation(expression, services);
  const declaredType = symbol && checker.getTypeOfSymbol(symbol);
  // Non-nullable declared types can hide missing indexed values or asserted nullable values.
  // Require a nullable declaration so an array type here is evidence of flow narrowing.
  if (!declaredType?.isUnion() || !declaredType.types.some(isNullOrUndefinedType)) {
    return false;
  }
  const type = getTypeFromTreeNode(expression, services);
  const constituents = type.isUnion() ? type.types : [type];
  return constituents.every(type => checker.isArrayType(type) || checker.isTupleType(type));
}
