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
import { createConstant, createNull } from '../values/constant';
import { type ExpressionHandler } from '../expression-handler';
import { createCallInstruction } from '../instructions/call-instruction';
import { createNewObjectFunctionDefinition } from '../function-definition';
import { createValue } from '../value';

export const handleLiteral: ExpressionHandler<TSESTree.Literal> = (node, functionInfo) => {
  const { constantRegistry, createValueIdentifier, valueByConstantTypeRegistry } =
    functionInfo.scopeManager;
  if (node.value === null) {
    return createNull();
  }

  let constant = constantRegistry.get(node.value);

  if (!constant) {
    constant = createConstant(createValueIdentifier(), node.value);

    constantRegistry.set(node.value, constant);
  }

  let value = valueByConstantTypeRegistry.get(typeof constant.value);

  if (!value) {
    value = createValue(typeof constant.value, functionInfo.scopeManager.createValueIdentifier());

    valueByConstantTypeRegistry.set(typeof constant.value, value);

    functionInfo.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createNewObjectFunctionDefinition(),
        [],
        node.loc,
      ),
    ]);
  }

  return constant;
};
