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
import { hasOnlyReactClassNonPropsReportedTypeUsage } from '../helpers/react.js';

/**
 * False-positive remediation escape:
 * returns true when the reported type or reported member is owned only through
 * React class non-props slots such as `state` / `snapshot`.
 */
export function hasOnlyNonPropsReportedTypeUsage(
  node: estree.Node,
  context: Rule.RuleContext,
): boolean {
  return hasOnlyReactClassNonPropsReportedTypeUsage(node, context);
}
