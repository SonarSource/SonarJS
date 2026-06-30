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

import type estree from 'estree';
import { isIdentifier } from '../../helpers/ast.js';
import { getTypeFromTreeNode, isBigIntArray, isNumberArray } from '../../helpers/type.js';
import {
  getChainedMethodCall,
  getComparatorlessSortCallInfo,
  getEqualityComparisonSibling,
  getJoinSeparator,
  isStringMapCall,
  type ComparatorlessSortCallInfo,
  type SortMatcherContext,
} from './helpers.js';

type StringJoinSortChainInfo = ComparatorlessSortCallInfo & {
  joinSeparator: string;
};

/**
 * False-positive shapes:
 *   a.slice().sort().map(String).join(',') === b.slice().sort().map(String).join(',')
 *   a.toSorted().map(String).join(',') !== b.toSorted().map(String).join(',')
 *   a.sort().map(String).join() == b.sort().map(String).join()
 *
 * What can vary:
 * - `sort()` vs `toSorted()`, as long as both sides use the same sort family
 * - the equality operator (`==`, `!=`, `===`, `!==`)
 * - the join separator, as long as both sides use the same safe one
 *
 * Here the sort call is only part of a normalization pipeline used to compare
 * two numeric arrays after converting both sides to the same canonical string.
 */
export function isSortUsedInStringJoinComparison(
  call: estree.CallExpression,
  ruleContext: SortMatcherContext,
): boolean {
  const chainRoot = getStringJoinSortChainRoot(call);
  if (chainRoot === null) {
    return false;
  }
  const sibling = getEqualityComparisonSibling(chainRoot);
  const callInfo = getStringJoinSortChainInfo(chainRoot, ruleContext);
  const siblingInfo = getStringJoinSortChainInfo(sibling, ruleContext);

  return (
    callInfo !== null &&
    siblingInfo !== null &&
    callInfo.methodName === siblingInfo.methodName &&
    callInfo.joinSeparator === siblingInfo.joinSeparator &&
    isSafeNumericJoinSeparator(callInfo.joinSeparator) &&
    isNumericSortReceiver(callInfo.receiver, ruleContext) &&
    isNumericSortReceiver(siblingInfo.receiver, ruleContext)
  );
}

function isSafeNumericJoinSeparator(separator: string): boolean {
  return separator.length > 0 && !/[0-9+\-.eEn]/.test(separator);
}

function isNumericSortReceiver(receiver: estree.Node, ruleContext: SortMatcherContext): boolean {
  const receiverType = getTypeFromTreeNode(receiver, ruleContext.services);
  return (
    isNumberArray(receiverType, ruleContext.services) ||
    isBigIntArray(receiverType, ruleContext.services)
  );
}

function getStringJoinSortChainRoot(call: estree.CallExpression): estree.CallExpression | null {
  const mapCall = getChainedMethodCall(call, 'map');
  if (mapCall === null || !isStringMapCall(mapCall)) {
    return null;
  }
  const joinCall = getChainedMethodCall(mapCall, 'join');
  if (joinCall === null || getJoinSeparator(joinCall) === null) {
    return null;
  }
  return joinCall;
}

function getStringJoinSortChainInfo(
  node: estree.Node | null,
  ruleContext: SortMatcherContext,
): StringJoinSortChainInfo | null {
  if (node?.type !== 'CallExpression') {
    return null;
  }
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    !isIdentifier(node.callee.property, 'join')
  ) {
    return null;
  }
  const joinSeparator = getJoinSeparator(node);
  if (joinSeparator === null) {
    return null;
  }
  const mapCall = node.callee.object;
  if (mapCall.type !== 'CallExpression' || !isStringMapCall(mapCall)) {
    return null;
  }
  if (mapCall.callee.type !== 'MemberExpression') {
    return null;
  }
  const sortInfo = getComparatorlessSortCallInfo(mapCall.callee.object, ruleContext);
  if (sortInfo === null) {
    return null;
  }
  return {
    ...sortInfo,
    joinSeparator,
  };
}
