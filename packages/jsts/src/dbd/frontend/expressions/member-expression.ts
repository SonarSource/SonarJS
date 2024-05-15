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
import { getLocation } from '../utils';
import { ScopeTranslator } from '../scope-translator';

export function handleMemberExpression(
  scopeTranslator: ScopeTranslator,
  memberExpression: TSESTree.MemberExpression,
): number {
  if (memberExpression.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
    throw new Error(
      `Unsupported member expression property type ${memberExpression.property.type} ${JSON.stringify(getLocation(memberExpression.property))}`,
    );
  }
  let objectValueId;
  if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.Identifier) {
    objectValueId = scopeTranslator.variableMap.get(memberExpression.object.name);
  } else if (memberExpression.object.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
    objectValueId = handleMemberExpression(scopeTranslator, memberExpression.object);
  }

  if (!objectValueId) {
    throw new Error(
      `Unable to parse member expression. Unknown object variable ${JSON.stringify(getLocation(memberExpression.object))}`,
    );
  }
  if (memberExpression.parent.type === TSESTree.AST_NODE_TYPES.CallExpression) {
    return objectValueId;
  } else {
    const fieldName = memberExpression.property.name;
    const functionId = scopeTranslator.getFunctionId(`#get-field# ${fieldName}`);
    const resultValueId = scopeTranslator.getNewValueId();
    scopeTranslator.addCallExpression(getLocation(memberExpression), resultValueId, functionId, [
      objectValueId,
    ]);
    return resultValueId;
  }
}
