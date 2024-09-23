/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S126

import { Rule } from 'eslint';
import estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      addMissingElseClause: 'Add the missing "else" clause.',
    },
  }),
  create(context) {
    return {
      IfStatement: (node: estree.Node) => {
        const ifstmt = node as TSESTree.IfStatement;
        if (isElseIf(ifstmt) && !ifstmt.alternate) {
          const sourceCode = context.sourceCode;
          const elseKeyword = sourceCode.getTokenBefore(
            node,
            token => token.type === 'Keyword' && token.value === 'else',
          );
          const ifKeyword = sourceCode.getFirstToken(
            node,
            token => token.type === 'Keyword' && token.value === 'if',
          );
          context.report({
            messageId: 'addMissingElseClause',
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

function isElseIf(node: TSESTree.IfStatement) {
  const { parent } = node;
  return parent?.type === 'IfStatement' && parent.alternate === node;
}
