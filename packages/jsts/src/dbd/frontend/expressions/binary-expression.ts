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
import { FunctionId } from '../../ir-gen/ir_pb';

export function handleBinaryExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.BinaryExpression,
  variableName: string | undefined = undefined,
) {
  if (expression.left.type === TSESTree.AST_NODE_TYPES.PrivateIdentifier) {
    throw new Error(`Unknown left operand of type ${expression.left.type}`);
  }
  const lhsId = handleExpression(scopeTranslator, expression.left);
  const rhsId = handleExpression(scopeTranslator, expression.right);
  const valueId = scopeTranslator.getNewValueId();
  const functionId = new FunctionId({ simpleName: `#binop ${expression.operator}` });
  scopeTranslator.addCallExpression(
    getLocation(expression),
    valueId,
    functionId,
    [lhsId, rhsId],
    variableName,
  );
}
