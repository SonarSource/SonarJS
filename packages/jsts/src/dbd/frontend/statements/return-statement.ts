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
import { handleExpression } from '../expressions';

export function handleReturnStatement(
  scopeTranslator: ScopeTranslator,
  returnStatement: TSESTree.ReturnStatement,
) {
  if (returnStatement.argument === null) {
    return scopeTranslator.addNullReturn(getLocation(returnStatement));
  } else {
    const valueId = handleExpression(scopeTranslator, returnStatement.argument);
    return scopeTranslator.addReturnInstruction(getLocation(returnStatement), valueId);
  }
}
