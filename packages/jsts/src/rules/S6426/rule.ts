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
// https://sonarsource.github.io/rspec/#/rspec/S6426/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isMethodCall, isIdentifier } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      issue: 'Remove ".only()" from your test case.',
      quickfix: 'Remove ."only()".',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (isMethodCall(node)) {
          const { property, object } = node.callee;
          if (isIdentifier(property, 'only') && isIdentifier(object, 'describe', 'it', 'test')) {
            context.report({
              messageId: 'issue',
              node: property,
              suggest: [
                {
                  fix: (fixer: Rule.RuleFixer) => {
                    const fixes = [fixer.remove(property)];
                    const dotBeforeOnly = context.sourceCode.getTokenBefore(property);
                    if (dotBeforeOnly != null) {
                      fixes.push(fixer.remove(dotBeforeOnly));
                    }
                    return fixes;
                  },
                  messageId: 'quickfix',
                },
              ],
            });
          }
        }
      },
    };
  },
};
