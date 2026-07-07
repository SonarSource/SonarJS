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
import type { SourceCode } from 'eslint';
import { isGenericType } from '../../helpers/type.js';

export type NoBaseToStringMatcherContext = {
  sourceCode: SourceCode;
  services: Parameters<typeof isGenericType>[1];
};

export function flattenConjunction(condition: TSESTree.Expression): TSESTree.Expression[] {
  if (condition.type === 'LogicalExpression' && condition.operator === '&&') {
    return [...flattenConjunction(condition.left), ...flattenConjunction(condition.right)];
  }
  return [condition];
}

export function flattenDisjunction(condition: TSESTree.Expression): TSESTree.Expression[] {
  if (condition.type === 'LogicalExpression' && condition.operator === '||') {
    return [...flattenDisjunction(condition.left), ...flattenDisjunction(condition.right)];
  }
  return [condition];
}
