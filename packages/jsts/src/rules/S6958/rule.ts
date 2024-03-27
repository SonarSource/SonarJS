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
import { TSESTree } from '@typescript-eslint/utils';
import { type Rule } from 'eslint';
import { type Node } from 'estree';

const NODES = new Set<string>([
  TSESTree.AST_NODE_TYPES.ArrayExpression,
  TSESTree.AST_NODE_TYPES.ClassExpression,
  TSESTree.AST_NODE_TYPES.ObjectExpression,
  TSESTree.AST_NODE_TYPES.Literal,
  TSESTree.AST_NODE_TYPES.TemplateLiteral,
]);

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      asFunction: 'Literal should not be used as function.',
      asTagFunction: 'Literal should not be used as tag function.',
    },
  },

  create(context) {
    const processNode = (node: Node, messageId: string): void => {
      if (NODES.has(node.type)) {
        context.report({
          node,
          messageId,
        });
      }
    };

    return {
      CallExpression(node) {
        processNode(node.callee, 'asFunction');
      },
      TaggedTemplateExpression(node) {
        processNode(node.tag, 'asTagFunction');
      },
    };
  },
};
