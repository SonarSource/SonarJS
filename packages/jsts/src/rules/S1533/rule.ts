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
// https://sonarsource.github.io/rspec/#/rspec/S1533/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';

const WRAPPER_TYPES = ['Boolean', 'Number', 'String'];

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      removeConstructor: 'Remove this use of "{{constructor}}" constructor.',
      replaceWrapper:
        'Replace this "{{wrapper}}" wrapper object with primitive type "{{primitive}}".',
      suggestRemoveNew: 'Remove "new" operator',
      suggestReplaceWrapper: 'Replace "{{wrapper}}" with "{{primitive}}"',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      NewExpression(node: estree.Node) {
        const konstructor = (node as estree.NewExpression).callee;
        if (konstructor.type === 'Identifier' && WRAPPER_TYPES.includes(konstructor.name)) {
          const newToken = context
            .getSourceCode()
            .getFirstToken(node, token => token.value === 'new')!;
          const [begin, end] = newToken.range;
          context.report({
            messageId: 'removeConstructor',
            data: {
              constructor: konstructor.name,
            },
            node,
            suggest: [
              {
                messageId: 'suggestRemoveNew',
                fix: fixer => fixer.removeRange([begin, end + 1]),
              },
            ],
          });
        }
      },
      TSTypeReference(node: estree.Node) {
        const typeString = context.getSourceCode().getText(node);
        if (WRAPPER_TYPES.includes(typeString)) {
          const primitiveType = typeString.toLowerCase();
          context.report({
            messageId: 'replaceWrapper',
            data: {
              wrapper: typeString,
              primitive: primitiveType,
            },
            node,
            suggest: [
              {
                messageId: 'suggestReplaceWrapper',
                data: {
                  wrapper: typeString,
                  primitive: primitiveType,
                },
                fix: fixer => fixer.replaceText(node, primitiveType),
              },
            ],
          });
        }
      },
    };
  },
};
