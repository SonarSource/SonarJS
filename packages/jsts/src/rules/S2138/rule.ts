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
// https://sonarsource.github.io/rspec/#/rspec/S2138/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isUndefined } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      useNull: 'Use null instead.',
    },
  },
  create(context: Rule.RuleContext) {
    function raiseOnUndefined(node: estree.Node) {
      if (isUndefined(node)) {
        context.report({
          messageId: 'useNull',
          node,
        });
      }
    }
    return {
      VariableDeclarator: (node: estree.Node) => {
        const { init } = node as estree.VariableDeclarator;
        if (init) {
          raiseOnUndefined(init);
        }
      },
      AssignmentExpression: (node: estree.Node) => {
        const { right } = node as estree.AssignmentExpression;
        raiseOnUndefined(right);
      },
      Property: (node: estree.Node) => {
        const { value } = node as estree.Property;
        raiseOnUndefined(value);
      },
    };
  },
};
