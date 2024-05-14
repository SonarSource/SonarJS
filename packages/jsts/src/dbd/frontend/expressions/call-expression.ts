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
import { handleMemberExpression } from './member-expression';
import { getLocation } from '../utils';
import { FunctionId } from '../../ir-gen/ir_pb';
import { ScopeTranslator } from '../scope-translator';

export function handleCallExpression(
  scopeTranslator: ScopeTranslator,
  callExpression: TSESTree.CallExpression,
) {
  let calleeValueId;
  let simpleName;
  switch (callExpression.callee.type) {
    case TSESTree.AST_NODE_TYPES.MemberExpression:
      calleeValueId = handleMemberExpression(scopeTranslator, callExpression.callee);
      if (callExpression.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier) {
        throw new Error(
          `Unhandled method call ${JSON.stringify(getLocation(callExpression.callee.property))}`,
        );
      }
      simpleName = callExpression.callee.property.name;
      break;
    case TSESTree.AST_NODE_TYPES.Identifier:
      simpleName = callExpression.callee.name;
      break;
    default:
      throw new Error(`Unsupported call expression callee ${callExpression.callee.type}`);
  }
  const resultValueId = scopeTranslator.getNewValueId();
  let args: number[] = [];
  if (calleeValueId) {
    args = [calleeValueId];
  }
  scopeTranslator.addCallExpression(
    getLocation(callExpression),
    resultValueId,
    new FunctionId({ simpleName }),
    args,
  );
  return resultValueId;
}
