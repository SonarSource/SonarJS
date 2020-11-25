/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-2432

import { Rule } from 'eslint';
import * as estree from 'estree';
import { childrenOf } from '../utils/visitor';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      'Property[kind="set"]': (node: estree.Node) => {
        ReturnStatementsVisitor.visit(node, context);
      },
    };
  },
};

class ReturnStatementsVisitor {
  static visit(root: estree.Node, context: Rule.RuleContext) {
    const visitNode = (node: estree.Node) => {
      if (node.type === 'ReturnStatement' && !!node.argument) {
        context.report({
          node,
          message: 'Consider removing this return statement; it will be ignored.',
        });
        return;
      }
      childrenOf(node, context.getSourceCode().visitorKeys).forEach(visitNode);
    };
    visitNode(root);
  }
}
