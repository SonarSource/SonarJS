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
import { handleIdentifier } from '../expressions/identifier';

export const handleExportNamedDeclaration: StatementHandler<TSESTree.ExportNamedDeclaration> = (
  node,
  functionInfo,
) => {
  if (node.declaration) {
    console.error(`Unsupported export named declaration with declaration`);
    return;
  } else {
    node.specifiers.forEach(specifier => {
      const localValue = handleIdentifier(specifier.local, functionInfo);
      const exportName = specifier.exported.name;
      functionInfo.addExport(exportName, localValue);
    });
  }
};
