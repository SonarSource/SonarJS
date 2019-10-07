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
// https://jira.sonarsource.com/browse/RSPEC-3626

import { Rule } from "eslint";
import * as estree from "estree";

const message = "Remove this redundant jump.";
const loops = "WhileStatement, ForStatement, DoWhileStatement, ForInStatement, ForOfStatement";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function reportIfLastStatement(node: estree.ContinueStatement | estree.ReturnStatement) {
      const withArgument = node.type === "ContinueStatement" ? !!node.label : !!node.argument;
      if (!withArgument) {
        const ancestors = context.getAncestors();
        const block = ancestors[ancestors.length - 1] as estree.BlockStatement;
        if (block.body[block.body.length - 1] === node && block.body.length > 1) {
          context.report({
            message,
            node,
          });
        }
      }
    }

    function reportIfLastStatementInsideIf(
      node: estree.ContinueStatement | estree.ReturnStatement,
    ) {
      const ancestors = context.getAncestors();
      const ifStatement = ancestors[ancestors.length - 2];
      const upperBlock = ancestors[ancestors.length - 3] as estree.BlockStatement;
      if (upperBlock.body[upperBlock.body.length - 1] === ifStatement) {
        reportIfLastStatement(node as estree.ContinueStatement);
      }
    }

    return {
      [`:matches(${loops}) > BlockStatement > ContinueStatement`]: (node: estree.Node) => {
        reportIfLastStatement(node as estree.ContinueStatement);
      },

      [`:matches(${loops}) > BlockStatement > IfStatement > BlockStatement > ContinueStatement`]: (
        node: estree.Node,
      ) => {
        reportIfLastStatementInsideIf(node as estree.ContinueStatement);
      },

      ":function > BlockStatement > ReturnStatement": (node: estree.Node) => {
        reportIfLastStatement(node as estree.ReturnStatement);
      },

      ":function > BlockStatement > IfStatement > BlockStatement > ReturnStatement": (
        node: estree.Node,
      ) => {
        reportIfLastStatementInsideIf(node as estree.ReturnStatement);
      },
    };
  },
};
