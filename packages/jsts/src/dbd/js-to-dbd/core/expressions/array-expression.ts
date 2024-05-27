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

import { ContextManager } from '../context-manager';
import { TSESTree } from '@typescript-eslint/utils';
import { createReference } from '../values/reference';
import { Instruction } from '../instruction';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createAddArrayLastFunctionDefinition,
  createNewObjectFunctionDefinition,
} from '../function-definition';
import { handleExpression } from './index';

export function handleArrayExpression(context: ContextManager, node: TSESTree.ArrayExpression) {
  const arrayIdentifier = context.scope.createValueIdentifier();
  const arrayValue = createReference(arrayIdentifier);

  const instructions: Instruction[] = [
    createCallInstruction(arrayIdentifier, null, createNewObjectFunctionDefinition(), [], node.loc),
  ];
  node.elements.forEach(element => {
    if (!element || element.type === TSESTree.AST_NODE_TYPES.SpreadElement) {
      console.error(`Unsupported array element at ${JSON.stringify(node.loc)}`);
      return;
    }
    const { instructions: elementInstructions, value: elementValue } = handleExpression(
      context,
      element,
    );
    instructions.push(...elementInstructions);
    instructions.push(
      createCallInstruction(
        context.scope.createValueIdentifier(),
        null,
        createAddArrayLastFunctionDefinition(),
        [arrayValue, elementValue],
        element.loc,
      ),
    );
  });
  return {
    instructions,
    value: arrayValue,
  };
}
