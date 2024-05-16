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
import { getLocation } from '../utils';
import { Function } from '../builtin-functions';
import { TSESTree } from '@typescript-eslint/utils';
import { TypeInfo, TypeInfo_Kind, TypeName } from '../../ir-gen/ir_pb';
import { handleExpression } from './index';

export function handleArrayExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.ArrayExpression,
  variableName: string | undefined = undefined,
) {
  const valueId = scopeTranslator.getNewValueId();
  const typeInfo = new TypeInfo({
    kind: TypeInfo_Kind.ARRAY,
    qualifiedName: 'list',
  });
  scopeTranslator.valueTable.typeNames.push(
    new TypeName({
      valueId,
      typeInfo,
      name: variableName,
    }),
  );
  scopeTranslator.addCallExpression(
    getLocation(expression),
    valueId,
    scopeTranslator.getFunctionId(Function.NewObject),
    [],
    variableName,
  );
  expression.elements.forEach(element => {
    if (!element || element.type === TSESTree.AST_NODE_TYPES.SpreadElement) {
      throw new Error('Unsupported spread operator in array expression');
    }
    const elementId = handleExpression(scopeTranslator, element);
    scopeTranslator.addCallExpression(
      getLocation(element),
      scopeTranslator.getNewValueId(),
      scopeTranslator.getFunctionId(Function.ArrayAddLast),
      [valueId, elementId],
      variableName,
    );
  });
  return valueId;
}
