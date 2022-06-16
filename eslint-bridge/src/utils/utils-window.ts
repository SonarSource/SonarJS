/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { Rule } from 'eslint';
import * as estree from 'estree';
import { getTypeAsString, childrenOf } from '../utils';

export function isWindowObject(node: estree.Node, context: Rule.RuleContext) {
  const type = getTypeAsString(node, context.parserServices);
  const hasWindowName = WindowNameVisitor.containsWindowName(node, context);
  return type.match(/window/i) || type.match(/globalThis/i) || hasWindowName;
}

class WindowNameVisitor {
  private hasWindowName = false;

  static containsWindowName(node: estree.Node, context: Rule.RuleContext) {
    const visitor = new WindowNameVisitor();
    visitor.visit(node, context);
    return visitor.hasWindowName;
  }

  private visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      if (node.type === 'Identifier' && node.name.match(/window/i)) {
        this.hasWindowName = true;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
