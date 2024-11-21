/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { TSESTree } from '@typescript-eslint/utils';
import { type Rule } from 'eslint';
import { type Node } from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

const NODES = new Set<string>([
  TSESTree.AST_NODE_TYPES.ArrayExpression,
  TSESTree.AST_NODE_TYPES.ClassExpression,
  TSESTree.AST_NODE_TYPES.ObjectExpression,
  TSESTree.AST_NODE_TYPES.Literal,
  TSESTree.AST_NODE_TYPES.TemplateLiteral,
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      asFunction: 'Literal should not be used as function.',
      asTagFunction: 'Literal should not be used as tag function.',
    },
  }),

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
