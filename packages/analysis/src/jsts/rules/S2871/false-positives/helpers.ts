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

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import type { RequiredParserServices } from '../../helpers/parser-services.js';
import { getNodeParent } from '../../helpers/ancestor.js';
import { copyingSortLike, sortLike } from '../../helpers/collection.js';
import { isIdentifier } from '../../helpers/ast.js';
import {
  getTypeFromTreeNode,
  isArrayLikeType,
  isBigIntArray,
  isBooleanArray,
  isNumberArray,
  isStringArray,
} from '../../helpers/type.js';

/**
 * Names of array sorting methods covered by S2871.
 *
 * This includes mutating sort-like methods such as `sort` and copying
 * sort-like methods such as `toSorted`.
 */
export const allSortLike = new Set([...sortLike, ...copyingSortLike]);

const equalityOperators = new Set(['==', '!=', '===', '!==']);

/**
 * Rule-scoped services needed by sort false-positive pattern matchers.
 *
 * Passing this object around keeps the extracted matchers independent from the
 * ESLint rule closure while still giving them access to scope lookup, source
 * text, and TypeScript type information.
 */
export type SortMatcherContext = {
  context: Rule.RuleContext;
  sourceCode: SourceCode;
  services: RequiredParserServices;
};

/**
 * Information extracted from a comparator-less sort-like call.
 *
 * `methodName` distinguishes `sort()` from `toSorted()` so normalization
 * patterns can require both sides of a comparison to use the same sort family.
 * `receiver` is the array-like expression being sorted.
 */
export type ComparatorlessSortCallInfo = {
  methodName: string;
  receiver: estree.Node;
};

/**
 * Checks whether a node is a direct `JSON.stringify(<expr>)` call.
 *
 * The match is intentionally narrow: exactly one argument, non-computed member
 * access, and the global-looking `JSON` identifier as receiver. It does not
 * match calls with replacer/space arguments, `JSON['stringify'](...)`, or
 * custom objects exposing a `stringify` method.
 */
export function isJsonStringifyCall(node: estree.Node | null): node is estree.CallExpression {
  if (node?.type !== 'CallExpression') {
    return false;
  }
  if (node.arguments.length !== 1) {
    return false;
  }
  const callee = node.callee;
  if (callee.type !== 'MemberExpression') {
    return false;
  }
  return (
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'JSON' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'stringify'
  );
}

/**
 * Returns the other side of an equality or inequality comparison.
 *
 * If `node` is not directly inside `==`, `!=`, `===`, or `!==`, there is no
 * comparison sibling to inspect and the function returns `null`.
 */
export function getEqualityComparisonSibling(node: estree.Node): estree.Node | null {
  const parent = getNodeParent(node);
  if (parent.type !== 'BinaryExpression' || !equalityOperators.has(parent.operator)) {
    return null;
  }
  return parent.left === node ? parent.right : parent.left;
}

/**
 * Returns a method call chained directly after an expression.
 *
 * For `object` representing `value.sort()`, asking for `map` matches
 * `value.sort().map(...)` and returns the `map(...)` call expression. Computed
 * member access such as `value.sort()['map'](...)` is intentionally ignored.
 */
export function getChainedMethodCall(
  object: estree.Node,
  methodName: string,
): estree.CallExpression | null {
  const member = getNodeParent(object);
  if (
    member.type !== 'MemberExpression' ||
    member.object !== object ||
    member.computed ||
    !isIdentifier(member.property, methodName)
  ) {
    return null;
  }
  const call = getNodeParent(member);
  if (call.type !== 'CallExpression' || call.callee !== member) {
    return null;
  }
  return call;
}

/**
 * Checks whether a call expression is `array.map(String)`.
 *
 * This recognizes the explicit conversion to strings that makes subsequent
 * default sorting intentional in the false-positive patterns handled by S2871.
 */
export function isStringMapCall(call: estree.CallExpression): boolean {
  return (
    call.arguments.length === 1 &&
    isIdentifier(call.arguments[0], 'String') &&
    call.callee.type === 'MemberExpression' &&
    isIdentifier(call.callee.property, 'map')
  );
}

/**
 * Extracts the separator from a `join` call when it is statically known.
 *
 * `join()` is treated as `join(',')`, matching JavaScript's default separator.
 * A single string literal argument is returned as-is. Other calls, such as
 * `join(separator)` or `join(',', extra)`, return `null` because the comparison
 * pattern can no longer prove both sides serialize identically.
 */
export function getJoinSeparator(call: estree.CallExpression): string | null {
  if (call.arguments.length === 0) {
    return ',';
  }
  if (
    call.arguments.length === 1 &&
    call.arguments[0].type === 'Literal' &&
    typeof call.arguments[0].value === 'string'
  ) {
    return call.arguments[0].value;
  }
  return null;
}

/**
 * Extracts information from a comparator-less `sort()` or `toSorted()` call.
 *
 * The call must have no arguments, use a known sort-like method name, and be
 * invoked on an array-like receiver according to TypeScript type information.
 */
export function getComparatorlessSortCallInfo(
  node: estree.Node,
  { sourceCode, services }: SortMatcherContext,
): ComparatorlessSortCallInfo | null {
  if (node.type !== 'CallExpression') {
    return null;
  }
  const callExpr = node as estree.CallExpression;
  if (callExpr.arguments.length !== 0) {
    return null;
  }
  if (callExpr.callee.type !== 'MemberExpression') {
    return null;
  }
  const callee = callExpr.callee;
  const text = sourceCode.getText(callee.property);
  if (!allSortLike.has(text)) {
    return null;
  }
  const receiverType = getTypeFromTreeNode(callee.object, services);
  if (!isArrayLikeType(receiverType, services)) {
    return null;
  }
  return {
    methodName: text,
    receiver: callee.object,
  };
}

/**
 * Checks whether a sort receiver is an array of primitive values with safe
 * normalization semantics for the S2871 false-positive patterns.
 *
 * Only number, bigint, string, and boolean arrays are accepted. Arrays of
 * objects, unknown values, unions, or custom wrappers still require S2871 to
 * report comparator-less sorting.
 */
export function isPrimitiveSortReceiver(
  receiver: estree.Node,
  { services }: SortMatcherContext,
): boolean {
  const receiverType = getTypeFromTreeNode(receiver, services);
  return (
    isNumberArray(receiverType, services) ||
    isBigIntArray(receiverType, services) ||
    isStringArray(receiverType, services) ||
    isBooleanArray(receiverType, services)
  );
}
