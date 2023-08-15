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
// https://sonarsource.github.io/rspec/#/rspec/S2688/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isIdentifier, isMemberExpression } from '../helpers';
import { interceptReport } from '../helpers';

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, (context, reportDescriptor) => {
    const suggest: Rule.SuggestionReportDescriptor[] = [];
    const node = (reportDescriptor as any).node as estree.Node;
    if (node.type === 'BinaryExpression') {
      const { left, operator, right } = node;
      let negate: boolean | null = null;
      switch (operator) {
        case '!=':
        case '!==':
          negate = true;
          break;
        case '==':
        case '===':
          negate = false;
          break;
      }
      if (negate !== null) {
        const arg = isNaNIdentifier(left) ? right : left;
        const argText = context.getSourceCode().getText(arg);
        const prefix = negate ? '!' : '';
        suggest.push(
          {
            desc: 'Use "isNaN()"',
            fix: fixer => fixer.replaceText(node, `${prefix}isNaN(${argText})`),
          },
          {
            desc: 'Use "Number.isNaN()"',
            fix: fixer => fixer.replaceText(node, `${prefix}Number.isNaN(${argText})`),
          },
        );
      }
    }
    context.report({ ...reportDescriptor, suggest });
  });
}

function isNaNIdentifier(node: estree.Node) {
  return isIdentifier(node, 'NaN') || isMemberExpression(node, 'Number', 'NaN');
}
