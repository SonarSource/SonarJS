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
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createBinaryOperationFunctionDefinition } from '../function-definition';
import { TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';

export const handleBinaryExpression: ExpressionHandler<TSESTree.BinaryExpression> = (
  node,
  functionInfo,
) => {
  const { left, right, operator } = node;

  // rhs
  const rightValue = handleExpression(right, functionInfo);

  // lhs
  const leftValue = handleExpression(left, functionInfo);

  const value = createReference(functionInfo.scopeManager.createValueIdentifier());

  functionInfo
    .getCurrentBlock()
    .instructions.push(
      createCallInstruction(
        value.identifier,
        null,
        createBinaryOperationFunctionDefinition(operator),
        [leftValue, rightValue],
        node.loc,
      ),
    );

  return value;
};
