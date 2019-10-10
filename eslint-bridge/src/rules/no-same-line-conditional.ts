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
// https://jira.sonarsource.com/browse/RSPEC-3972

import { AST, Rule } from "eslint";
import * as estree from "estree";
import { toEncodedMessage } from "./utils";

interface SiblingIfStatement {
  first: estree.IfStatement;
  following: estree.IfStatement;
}

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ["sonar-runtime"],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    return {
      "Program, BlockStatement, FunctionBody, SwitchCase": function(node: estree.Node) {
        const sourceCode = context.getSourceCode();
        const siblingIfStatements = getSiblingIfStatements(node);

        siblingIfStatements.forEach(siblingIfStatement => {
          const precedingIf = siblingIfStatement.first;
          const followingIf = siblingIfStatement.following;
          const precedingIfLastToken = sourceCode.getLastToken(precedingIf) as AST.Token;
          const followingIfToken = sourceCode.getFirstToken(followingIf) as AST.Token;
          if (
            !!precedingIf.loc &&
            !!followingIf.loc &&
            precedingIf.loc.end.line === followingIf.loc.start.line &&
            precedingIf.loc.start.line !== followingIf.loc.end.line
          ) {
            context.report({
              message: toEncodedMessage(`Move this "if" to a new line or add the missing "else".`, [
                precedingIfLastToken,
              ]),
              loc: followingIfToken.loc,
            });
          }
        });
      },
    };
  },
};

function getSiblingIfStatements(node: estree.Node): SiblingIfStatement[] {
  let statements: Array<estree.Node> = [];
  if (node.type === "Program" || node.type === "BlockStatement") {
    statements = node.body;
  } else if (node.type === "SwitchCase") {
    statements = node.consequent;
  }
  return statements.reduce<SiblingIfStatement[]>((siblingsArray, statement, currentIndex) => {
    const previousStatement = statements[currentIndex - 1];
    if (
      statement.type === "IfStatement" &&
      !!previousStatement &&
      previousStatement.type === "IfStatement"
    ) {
      return [{ first: previousStatement, following: statement }, ...siblingsArray];
    }
    return siblingsArray;
  }, []);
}
