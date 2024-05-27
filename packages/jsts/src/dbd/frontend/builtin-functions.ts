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

export const Function = {
  ArrayAddLast: '#array-add-last#',
  ArrayRead: '#array-read#',
  BinOp: (op: string) => `#binop ${op}#`,
  GetField: (field: string) => `#get-field# ${field}`,
  ID: '#id#',
  Main: '#__main__',
  MapSet: '#map-set#',
  NewObject: '#new-object#',
  SetField: (field: string) => `#set-field# ${field}`,
  UnaryOp: (op: string) => `#unaryop ${op}#`,
};
export type BuiltinFunction = keyof typeof Function;
export function isBuiltinFunction(simpleName: string): boolean {
  return simpleName.startsWith('#');
}
