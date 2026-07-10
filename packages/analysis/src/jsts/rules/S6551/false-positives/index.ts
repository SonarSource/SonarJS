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

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { isGenericType } from '../../helpers/type.js';
import { isGuardedByTypeofCheckFalsePositive } from './guarded-by-typeof-check.js';
import { isGuardedDirectToStringCallFalsePositive } from './guarded-direct-tostring-call.js';
import type { NoBaseToStringMatcherContext } from './helpers.js';

export function isFalsePositive(
  reportDescriptor: Rule.ReportDescriptor,
  ruleContext: NoBaseToStringMatcherContext,
): boolean {
  return (
    ('node' in reportDescriptor &&
      isGenericType(reportDescriptor.node as TSESTree.Node, ruleContext.services)) ||
    isGuardedDirectToStringCallFalsePositive(reportDescriptor, ruleContext) ||
    isGuardedByTypeofCheckFalsePositive(reportDescriptor, ruleContext)
  );
}
