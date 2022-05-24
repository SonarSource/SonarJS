/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      issue: 'Remove ".only()" from your test case.',
      quickfix: 'Remove .only().',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'only' &&
          node.callee.object.type === 'Identifier' &&
          ['describe', 'it', 'test'].includes(node.callee.object.name)
        ) {
          const onlyProp: estree.MemberExpression = node.callee;
          context.report({
            messageId: 'issue',
            node: node.callee.property,
            suggest: [
              {
                fix: (fixer: Rule.RuleFixer) => {
                  const fixes = [fixer.remove(onlyProp.property)];
                  const dotBeforeOnly = context.getSourceCode().getTokenBefore(onlyProp.property);
                  if (dotBeforeOnly != null) fixes.push(fixer.remove(dotBeforeOnly));
                  return fixes;
                },
                messageId: 'quickfix',
              },
            ],
          });
        }
      },
    };
  },
};
