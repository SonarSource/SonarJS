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
import { type ExpressionHandler } from '../expression-handler';
import { TSESTree } from '@typescript-eslint/typescript-estree';
import { createCallInstruction } from '../instructions/call-instruction';
import {
  createGetFieldFunctionDefinition,
  createIdentityFunctionDefinition,
} from '../function-definition';
import { createReference } from '../values/reference';
import { createNull } from '../values/constant';
import { type BaseValue } from '../value';
import { getParameter } from '../utils';
import { unresolvable } from '../scope-manager';

export const handleIdentifier: ExpressionHandler<TSESTree.Identifier> = (node, functionInfo) => {
  let value: BaseValue<any>;

  if (functionInfo.scopeManager.isParameter(node)) {
    return getParameter(functionInfo, node);
  }
  const identifierReference = functionInfo.scopeManager.getIdentifierReference(node);

  if (identifierReference.base === unresolvable) {
    value = createReference(functionInfo.scopeManager.createValueIdentifier());

    functionInfo.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createIdentityFunctionDefinition(),
        [createNull()],
        node.loc,
      ),
    ]);
  } else {
    value = identifierReference.base;
    functionInfo.addInstructions([
      createCallInstruction(
        value.identifier,
        null,
        createGetFieldFunctionDefinition(node.name),
        [createReference(functionInfo.scopeManager.getScopeId(identifierReference.variable.scope))],
        node.loc,
      ),
    ]);
  }

  return value;
};
