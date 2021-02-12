/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3973

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { LoopLike, toEncodedMessage } from './utils';
import { getParent } from 'eslint-plugin-sonarjs/lib/utils/nodes';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const sourceCode = context.getSourceCode();
    return {
      IfStatement: (node: estree.Node) => {
        const ifStatement = node as estree.IfStatement;
        const parent = getParent(context);
        if (parent && parent.type !== 'IfStatement') {
          const firstToken = sourceCode.getFirstToken(node);
          checkIndentation(firstToken, ifStatement.consequent, context);
        }

        if (ifStatement.alternate) {
          const elseToken = sourceCode.getTokenBefore(
            ifStatement.alternate,
            token => token.type === 'Keyword' && token.value === 'else',
          );
          const alternate = ifStatement.alternate;
          if (alternate.type === 'IfStatement') {
            //case with "else if", we have to check the consequent of the next if
            checkIndentation(elseToken, alternate.consequent, context);
          } else {
            checkIndentation(elseToken, alternate, context);
          }
        }
      },
      'WhileStatement, ForStatement, ForInStatement, ForOfStatement': (node: estree.Node) => {
        const firstToken = sourceCode.getFirstToken(node);
        checkIndentation(firstToken, (node as LoopLike).body, context);
      },
    };
  },
};

function checkIndentation(
  firstToken: AST.Token | null,
  statement: estree.Statement,
  context: Rule.RuleContext,
) {
  if (firstToken && statement.type !== 'BlockStatement') {
    const firstStatementToken = context.getSourceCode().getFirstToken(statement);
    if (
      firstStatementToken &&
      firstToken.loc.start.column >= firstStatementToken.loc.start.column
    ) {
      const message =
        `Use curly braces or indentation to denote the code conditionally ` +
        `executed by this "${firstToken.value}".`;
      context.report({
        message: toEncodedMessage(message, [firstStatementToken]),
        loc: firstToken.loc,
      });
    }
  }
}
