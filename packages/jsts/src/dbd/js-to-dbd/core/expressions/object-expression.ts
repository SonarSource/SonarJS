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
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createNewObjectFunctionDefinition,
  createSetFieldFunctionDefinition,
} from '../function-definition';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { handleExpression } from './index';
import { type ExpressionHandler } from '../expression-handler';
import { createValue } from '../value';

export const handleObjectExpression: ExpressionHandler<TSESTree.ObjectExpression> = (
  node,
  functionInfo,
) => {
  const { properties } = node;
  const { scopeManager, addInstructions } = functionInfo;

  const object = createValue('object', scopeManager.createValueIdentifier());

  addInstructions([
    createCallInstruction(
      object.identifier,
      null,
      createNewObjectFunctionDefinition(),
      [],
      node.loc,
    ),
  ]);

  for (const property of properties) {
    if (property.type === AST_NODE_TYPES.Property) {
      if (
        property.value.type === AST_NODE_TYPES.AssignmentPattern ||
        property.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
      ) {
        throw new Error(`Unable to handle object property type ${property.value.type}`);
      }

      const propertyValue = handleExpression(property.value, functionInfo);

      if (property.key.type !== AST_NODE_TYPES.Identifier) {
        console.error(`Unable to handle object property key of type ${property.key.type}`);
        continue;
      }
      if (property.computed) {
        console.error(`Unable to handle computed object keys`);
        continue;
      }
      functionInfo.addInstructions([
        createCallInstruction(
          functionInfo.scopeManager.createValueIdentifier(),
          null,
          createSetFieldFunctionDefinition(property.key.name),
          [object, propertyValue],
          node.loc,
        ),
      ]);
    }
  }

  return object;
};
