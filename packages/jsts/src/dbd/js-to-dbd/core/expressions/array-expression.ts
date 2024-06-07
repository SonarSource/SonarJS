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

import { TSESTree } from '@typescript-eslint/utils';
import { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createAddArrayLastFunctionDefinition,
  createDBDInternalFunctionDefinition,
  FunctionID,
} from '../function-definition';
import { handleExpression } from './index';
import { createTypeName } from '../values/type-name';
import { createTypeInfo } from '../type-info';
import type { ExpressionHandler } from '../expression-handler';

export const handleArrayExpression: ExpressionHandler<TSESTree.ArrayExpression> = (
  node,
  context,
) => {
  const arrayIdentifier = context.scopeManager.createValueIdentifier();
  const typeInfo = createTypeInfo('ARRAY', 'object', false);
  const arrayValue = createTypeName(arrayIdentifier, 'list', typeInfo);

  const instructions: Instruction[] = [
    createCallInstruction(
      arrayIdentifier,
      null,
      createDBDInternalFunctionDefinition(FunctionID.NEW_ARRAY),
      [],
      node.loc,
      typeInfo,
    ),
  ];
  node.elements.forEach(element => {
    if (!element || element.type === TSESTree.AST_NODE_TYPES.SpreadElement) {
      console.error(`Unsupported array element at ${JSON.stringify(node.loc)}`);
      return;
    }
    const elementValue = handleExpression(element, context);
    instructions.push(
      createCallInstruction(
        context.scopeManager.createValueIdentifier(),
        null,
        createAddArrayLastFunctionDefinition(),
        [arrayValue, elementValue],
        element.loc,
      ),
    );
  });
  context.blockManager.getCurrentBlock().instructions.push(...instructions);
  return arrayValue;
};
