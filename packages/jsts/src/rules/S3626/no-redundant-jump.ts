/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import docsUrl from '../utils/docs-url';

const loops = 'WhileStatement, ForStatement, DoWhileStatement, ForInStatement, ForOfStatement';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      removeRedundantJump: 'Remove this redundant jump.',
      suggestJumpRemoval: 'Remove this redundant jump',
    },
    schema: [],
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description: 'Jump statements should not be redundant',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    function reportIfLastStatement(node: TSESTree.ContinueStatement | TSESTree.ReturnStatement) {
      const withArgument = node.type === 'ContinueStatement' ? !!node.label : !!node.argument;
      if (!withArgument) {
        const block = node.parent as TSESTree.BlockStatement;
        if (block.body[block.body.length - 1] === node && block.body.length > 1) {
          const previousComments = context.sourceCode.getCommentsBefore(node);
          const previousToken =
            previousComments.length === 0
              ? context.sourceCode.getTokenBefore(node)!
              : previousComments[previousComments.length - 1];

          context.report({
            messageId: 'removeRedundantJump',
            node,
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
      const ancestors = context.sourceCode.getAncestors(node);
      const ifStatement = ancestors[ancestors.length - 2];
      const upperBlock = ancestors[ancestors.length - 3] as TSESTree.BlockStatement;
      if (upperBlock.body[upperBlock.body.length - 1] === ifStatement) {
        reportIfLastStatement(node);
      }
    }

    return {
      [`:matches(${loops}) > BlockStatement > ContinueStatement`]: (node: TSESTree.Node) => {
        reportIfLastStatement(node as TSESTree.ContinueStatement);
      },

      [`:matches(${loops}) > BlockStatement > IfStatement > BlockStatement > ContinueStatement`]: (
        node: TSESTree.Node,
      ) => {
        reportIfLastStatementInsideIf(node as TSESTree.ContinueStatement);
      },

      ':function > BlockStatement > ReturnStatement': (node: TSESTree.Node) => {
        reportIfLastStatement(node as TSESTree.ReturnStatement);
      },

      ':function > BlockStatement > IfStatement > BlockStatement > ReturnStatement': (
        node: TSESTree.Node,
      ) => {
        reportIfLastStatementInsideIf(node as TSESTree.ReturnStatement);
      },
    };
  },
};

export = rule;
