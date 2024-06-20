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
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { handleExpression } from './index';
import type { ExpressionHandler } from '../expression-handler';
import { createReference } from '../values/reference';
import { createCallInstruction } from '../instructions/call-instruction';
import { createGetFieldFunctionDefinition } from '../function-definition';

export const handleMemberExpression: ExpressionHandler<TSESTree.MemberExpression> = (
  node,
  functionInfo,
) => {
  const { object, property } = node;
  const objectValue = handleExpression(object, functionInfo);

  if (property.type === AST_NODE_TYPES.Literal || property.type === AST_NODE_TYPES.Identifier) {
    const propertyValue = property.type === AST_NODE_TYPES.Literal ? property.value : property.name;
    const resultValue = createReference(functionInfo.scopeManager.createValueIdentifier());
    functionInfo.addInstructions([
      createCallInstruction(
        resultValue.identifier,
        null,
        createGetFieldFunctionDefinition(String(propertyValue)),
        [objectValue],
        property.loc,
      ),
    ]);
    return resultValue;
  }
  console.error(`Unsupported property type ${property.type}`);
  return objectValue;
};
