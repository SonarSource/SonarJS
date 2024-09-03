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
// https://sonarsource.github.io/rspec/#/rspec/S7059/javascript

import { Rule } from 'eslint';
import { isRequiredParserServices, generateMeta, isThenable } from '../helpers';
import * as estree from 'estree';
import { meta } from './meta';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

const flaggedConstructors = new Set();

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      noAsyncConstructor: 'Move this asynchronous operation outside of the constructor.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    function isPromiseLike(expr: estree.Expression) {
      return isRequiredParserServices(services) && isThenable(expr, services);
    }

    function containingConstructor(node: estree.Expression) {
      return context.sourceCode.getAncestors(node).find(node => {
        return (
          node.type === AST_NODE_TYPES.MethodDefinition &&
          node.key.type === AST_NODE_TYPES.Identifier &&
          node.key.name === 'constructor'
        );
      });
    }

    return {
      CallExpression(node: estree.CallExpression) {
        const constructor = containingConstructor(node);
        if (constructor && isPromiseLike(node)) {
          flaggedConstructors.add(constructor);
        }
      },
      'Program:exit'() {
        flaggedConstructors.forEach(node => {
          context.report({
            node: node as estree.Node,
            messageId: 'noAsyncConstructor',
          });
        });
        flaggedConstructors.clear();
      },
    };
  },
};
