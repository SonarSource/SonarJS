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
import ts from 'typescript';

export function isKnownGlobalMethod(symbol: ts.Symbol) {
  const parent = (symbol as any).parent;
  if (!parent) {
    return false;
  }
  if (parent.parent) {
    return false;
  }
  const parentSymbol = parent as ts.Symbol;
  if (parentSymbol.escapedName === 'Array' && symbol.escapedName === 'push') {
    return true;
  }
  return false;
}
