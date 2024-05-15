/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import { ScopeTranslator } from '../scope-translator';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import { getLocation } from '../utils';
import { Function } from '../builtin-functions';

export function handleAssignmentExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.AssignmentExpression,
) {
  const rhsId = handleExpression(scopeTranslator, expression.right);
  switch (expression.operator) {
    case '=':
      switch (expression.left.type) {
        case TSESTree.AST_NODE_TYPES.Identifier:
          return scopeTranslator.addCallExpression(
            getLocation(expression),
            scopeTranslator.getNewValueId(),
            scopeTranslator.getFunctionId(Function.ID),
            [rhsId],
            expression.left.name,
          );
        case TSESTree.AST_NODE_TYPES.MemberExpression:
          const objectValueId = scopeTranslator.getResolvedVariable(expression.left.object);
          if (expression.left.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
            throw new Error(`Unexpected member field type ${expression.left.property.type}`);
          }
          const fieldName = expression.left.property.name;
          return scopeTranslator.addCallExpression(
            getLocation(expression),
            scopeTranslator.getNewValueId(),
            scopeTranslator.getFunctionId(Function.SetField(fieldName)),
            [objectValueId, rhsId],
          );
        default:
          throw new Error(`Unexpected left expression type ${expression.left.type}`);
      }
    default:
      throw new Error(`Unexpected operator ${expression.operator}`);
  }
}
