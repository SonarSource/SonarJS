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
// https://sonarsource.github.io/rspec/#/rspec/S3626

import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, RuleContext } from '../helpers';
import { Rule } from 'eslint';
import estree from 'estree';
import { meta } from './meta';

const loops = 'WhileStatement, ForStatement, DoWhileStatement, ForInStatement, ForOfStatement';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeRedundantJump: 'Remove this redundant jump.',
      suggestJumpRemoval: 'Remove this redundant jump',
    },
    hasSuggestions: true,
  }),
  create(context) {
    function reportIfLastStatement(node: TSESTree.ContinueStatement | TSESTree.ReturnStatement) {
      const withArgument = node.type === 'ContinueStatement' ? !!node.label : !!node.argument;
      if (!withArgument) {
        const block = node.parent as TSESTree.BlockStatement;
        if (block.body[block.body.length - 1] === node && block.body.length > 1) {
          const previousComments = (context as unknown as RuleContext).sourceCode.getCommentsBefore(
            node,
          );
          const previousToken =
            previousComments.length === 0
              ? (context as unknown as RuleContext).sourceCode.getTokenBefore(node)!
              : previousComments[previousComments.length - 1];

          context.report({
            messageId: 'removeRedundantJump',
            node: node as estree.ContinueStatement,
            suggest: [
              {
                messageId: 'suggestJumpRemoval',
                fix: fixer => fixer.removeRange([previousToken.range[1], node.range[1]]),
              },
            ],
          });
        }
      }
    }

    function reportIfLastStatementInsideIf(
      node: TSESTree.ContinueStatement | TSESTree.ReturnStatement,
    ) {
      const ancestors = (context as unknown as RuleContext).sourceCode.getAncestors(node);
      const ifStatement = ancestors[ancestors.length - 2];
      const upperBlock = ancestors[ancestors.length - 3] as TSESTree.BlockStatement;
      if (upperBlock.body[upperBlock.body.length - 1] === ifStatement) {
        reportIfLastStatement(node);
      }
    }

    return {
      [`:matches(${loops}) > BlockStatement > ContinueStatement`]: (node: estree.Node) => {
        reportIfLastStatement(node as TSESTree.ContinueStatement);
      },

      [`:matches(${loops}) > BlockStatement > IfStatement > BlockStatement > ContinueStatement`]: (
        node: estree.Node,
      ) => {
        reportIfLastStatementInsideIf(node as TSESTree.ContinueStatement);
      },

      ':function > BlockStatement > ReturnStatement': (node: estree.Node) => {
        reportIfLastStatement(node as TSESTree.ReturnStatement);
      },

      ':function > BlockStatement > IfStatement > BlockStatement > ReturnStatement': (
        node: estree.Node,
      ) => {
        reportIfLastStatementInsideIf(node as TSESTree.ReturnStatement);
      },
    };
  },
};
