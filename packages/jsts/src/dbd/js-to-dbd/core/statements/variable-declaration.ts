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
import { TSESTree } from '@typescript-eslint/typescript-estree';
import type { StatementHandler } from '../statement-handler';
import { compileAsAssignment, handleExpression } from '../expressions';
import { createNull } from '../values/constant';

export const handleVariableDeclaration: StatementHandler<TSESTree.VariableDeclaration> = (
  node,
  functionInfo,
) => {
  for (const declaration of node.declarations) {
    const { init, id } = declaration;
    const initValue = init ? handleExpression(init, functionInfo) : createNull();
    compileAsAssignment(id, functionInfo, initValue);
  }
};
