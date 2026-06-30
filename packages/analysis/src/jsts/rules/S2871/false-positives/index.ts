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
import type { SortMatcherContext } from './helpers.js';
import { isSortReturnedByComparedNormalizer } from './compared-normalizer.js';
import { isSortUsedInJsonStringifyComparison } from './json-stringify-sort-comparison.js';
import { isSortUsedInStringJoinComparison } from './string-join-sort-comparison.js';

export { isSortReturnedByComparedNormalizer } from './compared-normalizer.js';
export { isSortUsedInJsonStringifyComparison } from './json-stringify-sort-comparison.js';
export { isSortUsedInStringJoinComparison } from './string-join-sort-comparison.js';

export function isSortUsedForNormalizationComparison(
  call: estree.CallExpression,
  ruleContext: SortMatcherContext,
): boolean {
  return (
    isSortUsedInJsonStringifyComparison(call, ruleContext) ||
    isSortUsedInStringJoinComparison(call, ruleContext) ||
    isSortReturnedByComparedNormalizer(call, ruleContext)
  );
}
