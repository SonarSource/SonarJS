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
import { handleExpression } from '../expressions';
import { ScopeTranslator } from '../scope-translator';

export function handleVariableDeclaration(
  scopeTranslator: ScopeTranslator,
  declaration: TSESTree.VariableDeclaration,
) {
  if (declaration.declarations.length !== 1) {
    throw new Error(
      `Unable to handle declaration with ${declaration.declarations.length} declarations (${JSON.stringify(getLocation(declaration))})`,
    );
  }
  const declarator = declaration.declarations[0];
  if (!declarator || declarator.type !== TSESTree.AST_NODE_TYPES.VariableDeclarator) {
    throw new Error('Unhandled declaration');
  }
  if (declarator.id.type !== TSESTree.AST_NODE_TYPES.Identifier) {
    throw new Error(`Unhandled declaration id type ${declarator.id.type}`);
  }
  const variableName = declarator.id.name;
  return handleExpression(scopeTranslator, declarator.init, variableName);
}
