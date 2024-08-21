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
// https://sonarsource.github.io/rspec/#/rspec/S6666/javascript

import { AST, Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, interceptReport } from '../helpers';
import { meta } from './meta';

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    (context, reportDescriptor) => {
      const suggest: Rule.SuggestionReportDescriptor[] = [];
      const node = (reportDescriptor as any).node as estree.Node;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.arguments.length === 2
      ) {
        const {
          callee: { object, property },
          arguments: [, args],
        } = node;
        if (
          property.type === 'Identifier' &&
          property.name === 'apply' &&
          object.range &&
          args.range
        ) {
          const range: AST.Range = [object.range[1], args.range[0]];
          suggest.push({
            desc: 'Replace apply() with spread syntax',
            fix: fixer => fixer.replaceTextRange(range, '(...'),
          });
        }
      }
      context.report({ ...reportDescriptor, suggest });
    },
  );
}
