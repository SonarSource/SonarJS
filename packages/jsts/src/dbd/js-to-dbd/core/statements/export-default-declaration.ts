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
import { StatementHandler } from '../statement-handler';
import { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { handleExpression } from '../expressions';

export const handleExportDefaultDeclaration: StatementHandler<TSESTree.ExportDefaultDeclaration> = (
  node,
  functionInfo,
) => {
  const { declaration } = node;
  if (declaration.type !== AST_NODE_TYPES.Identifier) {
    console.error(`Unhandled export default declaration ${declaration.type}`);
    return;
  }
  const result = handleExpression(declaration, functionInfo);
  functionInfo.addDefaultExport(result);
};
