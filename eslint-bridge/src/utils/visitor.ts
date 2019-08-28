/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import * as estree from "estree";
import * as evk from "eslint-visitor-keys";

export default function visit(root: estree.Node, callback: (node: estree.Node) => void): void {
  const stack: estree.Node[] = [root];
  while (stack.length) {
    const node = stack.pop() as estree.Node;
    callback(node);
    stack.push(...childrenOf(node).reverse());
  }
}

function childrenOf(node: estree.Node): estree.Node[] {
  const keys = evk.KEYS[node.type];
  const children = [];
  if (keys) {
    for (const key of keys) {
      const child = (node as any)[key];
      if (Array.isArray(child)) {
        children.push(...child);
      } else {
        children.push(child);
      }
    }
  }
  return children.filter(Boolean);
}
