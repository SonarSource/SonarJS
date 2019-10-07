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
// https://jira.sonarsource.com/browse/RSPEC-1110

import { AST, Rule, SourceCode } from "eslint";
import * as estree from "estree";
import { IssueLocation } from "../analyzer";
import { EncodedMessage } from "eslint-plugin-sonarjs/lib/utils/locations";
import { getParent } from "eslint-plugin-sonarjs/lib/utils/nodes";

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
      "*": function(node: estree.Node) {
        checkRedundantParenthesis(context.getSourceCode(), node, context);
      },
    };
  },
};

function isParentStatementWithParentheses(node: estree.Node, parent: estree.Node): boolean {
  return (
    ((parent.type === "IfStatement" ||
      parent.type === "WhileStatement" ||
      parent.type === "DoWhileStatement") &&
      parent.test === node) ||
    ((parent.type === "CallExpression" || parent.type === "NewExpression") &&
      parent.arguments.includes(node as estree.Expression))
  );
}

function checkRedundantParenthesis(
  sourceCode: SourceCode,
  node: estree.Node,
  context: Rule.RuleContext,
) {
  const tokenBefore = sourceCode.getTokenBefore(node);
  const tokenAfter = sourceCode.getTokenAfter(node);

  if (tokenBefore !== null && tokenAfter !== null && isParenthesesPair(tokenBefore, tokenAfter)) {
    let previousToken = sourceCode.getTokenBefore(tokenBefore);
    let followingToken = sourceCode.getTokenAfter(tokenAfter);

    const parent = getParent(context);
    let skipFirst = !!parent && isParentStatementWithParentheses(node, parent);

    while (
      previousToken !== null &&
      followingToken !== null &&
      isParenthesesPair(previousToken, followingToken)
    ) {
      if (!skipFirst) {
        context.report({
          message: toEncodedMessage(followingToken),
          loc: previousToken.loc,
        });
      }

      skipFirst = false;
      previousToken = sourceCode.getTokenBefore(previousToken);
      followingToken = sourceCode.getTokenAfter(followingToken);
    }
  }
}

function isParenthesesPair(tokenBefore: AST.Token, tokenAfter: AST.Token): boolean {
  return tokenBefore.value === "(" && tokenAfter.value === ")";
}

function toEncodedMessage(secondaryLocationToken: AST.Token): string {
  const encodedMessage: EncodedMessage = {
    message: `Remove these useless parentheses.`,
    secondaryLocations: [toSecondaryLocation(secondaryLocationToken)],
  };
  return JSON.stringify(encodedMessage);
}

function toSecondaryLocation(secondaryLocation: AST.Token): IssueLocation {
  return {
    column: secondaryLocation.loc.start.column,
    line: secondaryLocation.loc.start.line,
    endColumn: secondaryLocation.loc.end.column,
    endLine: secondaryLocation.loc.end.line,
  };
}
