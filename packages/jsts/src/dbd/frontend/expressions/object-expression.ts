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
import { Constant, FunctionId, TypeInfo, TypeInfo_Kind } from '../../ir-gen/ir_pb';
import { getLocation } from '../utils';
import { ScopeTranslator } from '../scope-translator';
import { handleExpression } from './index';

export function handleObjectExpression(
  scopeTranslator: ScopeTranslator,
  expression: TSESTree.ObjectExpression,
  variableName: string | undefined,
) {
  const objectValueId = scopeTranslator.getNewValueId();
  const typeInfo = new TypeInfo({
    kind: TypeInfo_Kind.CLASS,
    qualifiedName: 'object',
  });
  const newConstant = new Constant({ valueId: objectValueId, typeInfo });
  scopeTranslator.valueTable.constants.push(newConstant);
  scopeTranslator.addCallExpression(
    getLocation(expression),
    objectValueId,
    new FunctionId({ simpleName: '#new-object#', isStandardLibraryFunction: true }),
    [],
    variableName,
  );
  expression.properties.forEach(prop => {
    if (
      prop.type === TSESTree.AST_NODE_TYPES.SpreadElement ||
      prop.value.type === TSESTree.AST_NODE_TYPES.AssignmentPattern
    ) {
      throw new Error('Unsupported object expression parsing');
    }
    if (prop.value.type === 'TSEmptyBodyFunctionExpression') {
      return;
    }
    const keyId = handleExpression(scopeTranslator, prop.key);
    const valueId = handleExpression(scopeTranslator, prop.value);
    const resultValueId = scopeTranslator.getNewValueId();
    scopeTranslator.addCallExpression(
      getLocation(prop),
      resultValueId,
      new FunctionId({ simpleName: '#map-set#', isStandardLibraryFunction: true }),
      [objectValueId, keyId, valueId],
    );
  });
  if (variableName) {
    scopeTranslator.variableMap.set(variableName, objectValueId);
  }
  return objectValueId;
}
