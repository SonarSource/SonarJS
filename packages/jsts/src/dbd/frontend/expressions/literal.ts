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
import { Constant, TypeInfo, TypeInfo_Kind, TypeName } from '../../ir-gen/ir_pb';
import { getLocation } from '../utils';
import { ScopeTranslator } from '../scope-translator';

type NonNullLiteral = string | number | bigint | boolean | RegExp;

export function handleValueWithoutCall(scopeTranslator: ScopeTranslator, value: NonNullLiteral) {
  const valueId = scopeTranslator.getNewValueId();
  const typeInfo = new TypeInfo({
    kind: TypeInfo_Kind.PRIMITIVE,
    qualifiedName: typeof value,
  });
  const newConstant = new Constant({ value: String(value), valueId, typeInfo });
  scopeTranslator.valueTable.constants.push(newConstant);
  return valueId;
}

export function handleLiteralWithoutCall(
  scopeTranslator: ScopeTranslator,
  literal: TSESTree.Literal,
) {
  const value = literal.value;
  let valueId;
  if (value === null) {
    valueId = 0;
  } else {
    valueId = handleValueWithoutCall(scopeTranslator, value);
  }
  return valueId;
}

export function handleExpressionLiteral(
  scopeTranslator: ScopeTranslator,
  literal: TSESTree.Literal,
  variableName: string | undefined,
) {
  const constantId = handleLiteralWithoutCall(scopeTranslator, literal);
  if (variableName) {
    const functionId = scopeTranslator.getFunctionId('#id');
    const valueId = scopeTranslator.getNewValueId();
    scopeTranslator.addCallExpression(
      getLocation(literal),
      valueId,
      functionId,
      [constantId],
      variableName,
    );
    scopeTranslator.valueTable.typeNames.push(
      new TypeName({
        valueId,
        name: variableName,
        typeInfo: scopeTranslator.getTypeInfo(constantId),
      }),
    );
    scopeTranslator.variableMap.set(variableName, valueId);
    return valueId;
  } else {
    return constantId;
  }
}
