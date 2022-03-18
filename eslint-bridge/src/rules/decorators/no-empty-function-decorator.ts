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
// https://sonarsource.github.io/rspec/#/rspec/S1186/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { interceptReport } from '../../utils';

type FunctionLike =
  | estree.ArrowFunctionExpression
  | estree.FunctionDeclaration
  | estree.FunctionExpression;

// core implementation of this rule does not provide quick fixes
export function decorateNoEmptyFunction(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, (context, reportDescriptor) => {
    const func = (reportDescriptor as any).node as FunctionLike;
    const name = reportDescriptor.data!.name;
    const openingBrace = context.getSourceCode().getFirstToken(func.body)!;
    const closingBrace = context.getSourceCode().getLastToken(func.body)!;
    let commentPlaceholder: string;
    if (openingBrace.loc.start.line === closingBrace.loc.start.line) {
      commentPlaceholder = ` /* TODO document why this ${name} is empty */ `;
    } else {
      const columnOffset = closingBrace.loc.start.column;
      const padding = ' '.repeat(columnOffset);
      commentPlaceholder = `\n${padding}  // TODO document why this ${name} is empty\n${padding}`;
    }
    context.report({
      ...reportDescriptor,
      suggest: [
        {
          desc: 'Insert placeholder comment',
          fix: fixer => fixer.insertTextAfter(openingBrace, commentPlaceholder),
        },
      ],
    });
  });
}
