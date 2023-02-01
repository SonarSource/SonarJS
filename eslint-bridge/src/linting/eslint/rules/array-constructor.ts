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
// https://sonarsource.github.io/rspec/#/rspec/S1528/javascript
import { Rule } from 'eslint';
import * as estree from 'estree';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    function checkNewExpression(node: estree.Node) {
      const newExpression = node as estree.NewExpression;
      if (newExpression.callee.type === 'Identifier' && newExpression.callee.name === 'Array') {
        let message = 'Use either a literal or "Array.from()" instead of the "Array" constructor.';
        if (
          newExpression.arguments.length === 1 &&
          newExpression.arguments[0].type === 'Literal' &&
          typeof newExpression.arguments[0].value === 'number'
        ) {
          message = 'Use "Array.from()" instead of the "Array" constructor.';
        }
        context.report({ node, message });
      }
    }

    return {
      NewExpression: checkNewExpression,
    };
  },
};
