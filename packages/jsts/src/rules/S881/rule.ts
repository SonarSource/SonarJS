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
// https://sonarsource.github.io/rspec/#/rspec/S881/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      extractOperation: 'Extract this {{incrementType}} operation into a dedicated statement.',
    },
  }),
  create(context: Rule.RuleContext) {
    function reportUpdateExpression(node: estree.UpdateExpression) {
      context.report({
        messageId: 'extractOperation',
        data: {
          incrementType: node.operator === '++' ? 'increment' : 'decrement',
        },
        node,
      });
    }

    return {
      UpdateExpression(node: estree.Node) {
        if (!isIgnored(node, context.sourceCode.getAncestors(node))) {
          reportUpdateExpression(node as estree.UpdateExpression);
        }
      },
    };
  },
};

function isIgnored(node: estree.Node, ancestors: estree.Node[]): boolean {
  const firstAncestor = ancestors.pop();

  if (firstAncestor) {
    switch (firstAncestor.type) {
      case 'ExpressionStatement':
        return true;
      case 'ForStatement':
        return firstAncestor.update === node;
      case 'SequenceExpression': {
        const secondAncestor = ancestors.pop();
        return (
          secondAncestor !== undefined &&
          secondAncestor.type === 'ForStatement' &&
          secondAncestor.update === firstAncestor
        );
      }
    }
  }
  return false;
}
