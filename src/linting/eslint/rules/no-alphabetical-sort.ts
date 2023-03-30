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
// https://sonarsource.github.io/rspec/#/rspec/S2871/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  getTypeFromTreeNode,
  isArrayLikeType,
  isRequiredParserServices,
  sortLike,
} from './helpers';

const compareFunctionPlaceholder = '(a, b) => (a - b)';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      provideCompareFunction:
        'Provide a compare function to avoid sorting elements alphabetically.',
      suggestCompareFunction: 'Add a comparator function to sort in ascending order',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'CallExpression[arguments.length=0][callee.type="MemberExpression"]': (
        call: estree.CallExpression,
      ) => {
        const { object, property } = call.callee as estree.MemberExpression;
        const text = context.getSourceCode().getText(property);
        if (sortLike.includes(text) && isArrayLikeNode(object)) {
          const closingParenthesis = context
            .getSourceCode()
            .getLastToken(call, token => token.value === ')')!;
          context.report({
            messageId: 'provideCompareFunction',
            node: property as estree.Node,
            suggest: [
              {
                messageId: 'suggestCompareFunction',
                fix: fixer =>
                  fixer.insertTextBefore(closingParenthesis, compareFunctionPlaceholder),
              },
            ],
          });
        }
      },
    };

    function isArrayLikeNode(node: estree.Node) {
      const type = getTypeFromTreeNode(node, services);
      return isArrayLikeType(type, services);
    }
  },
};
