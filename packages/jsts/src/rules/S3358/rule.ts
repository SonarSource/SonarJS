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
// https://sonarsource.github.io/rspec/#/rspec/S3358/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      extractTernary: 'Extract this nested ternary operation into an independent statement.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'ConditionalExpression ConditionalExpression': (node: estree.Node) => {
        if (!isNestingBroken(context.sourceCode.getAncestors(node))) {
          context.report({
            messageId: 'extractTernary',
            node,
          });
        }
      },
    };
  },
};

function isNestingBroken(ancestors: estree.Node[]) {
  let parent = ancestors.pop()!;
  while (parent.type !== 'ConditionalExpression') {
    if (breaksNesting(parent)) {
      return true;
    }
    parent = ancestors.pop()!;
  }
  return false;
}

function breaksNesting(node: estree.Node) {
  return [
    'ArrayExpression',
    'ObjectExpression',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'JSXExpressionContainer',
  ].includes(node.type);
}
