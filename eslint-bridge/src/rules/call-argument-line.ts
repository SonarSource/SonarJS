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
// https://jira.sonarsource.com/browse/RSPEC-1472

import { Rule } from "eslint";
import * as estree from "estree";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.Node) => {
        const call = node as estree.CallExpression;
        if (call.callee.type !== "CallExpression" && call.arguments.length === 1) {
          const sourceCode = context.getSourceCode();
          const parenthesis = sourceCode.getLastTokenBetween(
            call.callee,
            call.arguments[0],
            token => token.type === "Punctuator" && token.value === ")",
          );
          const calleeLastLine = (parenthesis ? parenthesis : sourceCode.getLastToken(call.callee))!
            .loc.end.line;
          const { start } = sourceCode.getTokenAfter(call.callee)!.loc;
          if (calleeLastLine !== start.line) {
            const message = `Make those call arguments start on line ${calleeLastLine}`;
            const { end } = sourceCode.getLastToken(call)!.loc;
            if (end.line !== start.line) {
              //If arguments span multiple lines, we only report the first one
              reportIssue(start, message, context);
            } else {
              reportIssue({ start, end }, message, context);
            }
          }
        }
      },
    };
  },
};

function reportIssue(
  loc: { start: estree.Position; end: estree.Position } | estree.Position,
  message: string,
  context: Rule.RuleContext,
) {
  context.report({
    message,
    loc,
  });
}
