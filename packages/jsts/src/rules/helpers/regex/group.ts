/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import * as estree from 'estree';
import { isStringLiteral } from '../';

export interface GroupReference {
  raw: string;
  value: string;
}

export function extractReferences(node: estree.Node) {
  const references: GroupReference[] = [];
  if (isStringLiteral(node)) {
    const str = node.value as string;
    const reg = /\$(\d+)|\$\<([a-zA-Z][a-zA-Z0-9_]*)\>/g;
    let match: RegExpExecArray | null;
    while ((match = reg.exec(str)) !== null) {
      const [raw, index, name] = match;
      const value = index || name;
      references.push({ raw, value });
    }
  }
  return references;
}
