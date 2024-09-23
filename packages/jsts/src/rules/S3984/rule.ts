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
// https://sonarsource.github.io/rspec/#/rspec/S3984/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, getParent } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      throwOrRemoveError: 'Throw this error or remove this useless statement.',
      suggestThrowError: 'Throw this error',
    },
  }),
  create(context: Rule.RuleContext) {
    function looksLikeAnError(expression: estree.Expression | estree.Super): boolean {
      const text = context.sourceCode.getText(expression);
      return text.endsWith('Error') || text.endsWith('Exception');
    }

    return {
      'ExpressionStatement > NewExpression'(node: estree.Node) {
        const expression = (node as estree.NewExpression).callee;
        if (looksLikeAnError(expression)) {
          context.report({
            messageId: 'throwOrRemoveError',
            node,
            suggest: [
              {
                messageId: 'suggestThrowError',
                fix: fixer => fixer.insertTextBefore(getParent(context, node)!, 'throw '),
              },
            ],
          });
        }
      },
    };
  },
};
