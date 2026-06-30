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
import { getNodeParent } from '../../helpers/ancestor.js';
import {
  getComparatorlessSortCallInfo,
  getEqualityComparisonSibling,
  isJsonStringifyCall,
  isPrimitiveSortReceiver,
  type SortMatcherContext,
} from './helpers.js';

// Matches JSON.stringify(arr.sort()) == JSON.stringify(arr.sort()) or
// JSON.stringify(arr.toSorted()) == JSON.stringify(arr.toSorted()) when both
// sides use the same sort family over primitive arrays with known-safe
// default sort semantics (number, string, boolean, bigint).
export function isSortUsedInJsonStringifyComparison(
  call: estree.CallExpression,
  ruleContext: SortMatcherContext,
): boolean {
  const parent = getNodeParent(call);
  if (!isJsonStringifyCall(parent) || parent.arguments[0] !== call) {
    return false;
  }
  const sibling = getEqualityComparisonSibling(parent);
  if (!isJsonStringifyCall(sibling)) {
    return false;
  }

  const callInfo = getComparatorlessSortCallInfo(call, ruleContext);
  const siblingInfo = getComparatorlessSortCallInfo(sibling.arguments[0], ruleContext);
  if (callInfo === null || siblingInfo === null) {
    return false;
  }

  return (
    callInfo.methodName === siblingInfo.methodName &&
    isPrimitiveSortReceiver(callInfo.receiver, ruleContext) &&
    isPrimitiveSortReceiver(siblingInfo.receiver, ruleContext)
  );
}
