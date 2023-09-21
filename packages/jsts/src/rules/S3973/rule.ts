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
// https://sonarsource.github.io/rspec/#/rspec/S3973/javascript

import { Rule, AST, SourceCode } from 'eslint';
import * as estree from 'estree';
import { getParent, LoopLike, toEncodedMessage } from '../helpers';
import { TSESLint } from '@typescript-eslint/experimental-utils';
import { SONAR_RUNTIME } from '../../linter/parameters';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
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
            checkIndentation(
              getPrecedingBrace(elseToken, sourceCode) || elseToken,
              alternate,
              context,
              elseToken,
            );
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
  tokenToReport = firstToken,
) {
  if (firstToken && tokenToReport && statement.type !== 'BlockStatement') {
    const firstStatementToken = context.sourceCode.getFirstToken(statement);
    if (
      firstStatementToken &&
      firstToken.loc.start.column >= firstStatementToken.loc.start.column
    ) {
      const message =
        `Use curly braces or indentation to denote the code conditionally ` +
        `executed by this "${tokenToReport.value}".`;
      context.report({
        message: toEncodedMessage(message, [firstStatementToken as TSESLint.AST.Token]),
        loc: tokenToReport.loc,
      });
    }
  }
}

function getPrecedingBrace(elseToken: AST.Token | null, sourceCode: SourceCode) {
  if (elseToken) {
    const tokenBeforeElse = sourceCode.getTokenBefore(elseToken);
    if (
      tokenBeforeElse?.value === '}' &&
      tokenBeforeElse.loc.start.line === elseToken.loc.start.line
    ) {
      return tokenBeforeElse;
    }
  }
  return undefined;
}
