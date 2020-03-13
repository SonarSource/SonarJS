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
// https://jira.sonarsource.com/browse/RSPEC-126

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getParent } from 'eslint-plugin-sonarjs/lib/utils/nodes';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      IfStatement: (node: estree.Node) => {
        const ifstmt = node as estree.IfStatement;
        if (isElseIf(ifstmt, context) && !ifstmt.alternate) {
          const sourceCode = context.getSourceCode();
          const elseKeyword = sourceCode.getTokenBefore(
            node,
            token => token.type === 'Keyword' && token.value === 'else',
          );
          const ifKeyword = sourceCode.getFirstToken(
            node,
            token => token.type === 'Keyword' && token.value === 'if',
          );
          context.report({
            message: `Add the missing "else" clause.`,
            loc: {
              start: elseKeyword!.loc.start,
              end: ifKeyword!.loc.end,
            },
          });
        }
      },
    };
  },
};

function isElseIf(node: estree.IfStatement, context: Rule.RuleContext) {
  const parent = getParent(context);
  return parent && parent.type === 'IfStatement' && parent.alternate === node;
}
