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
// https://sonarsource.github.io/rspec/#/rspec/S108/javascript

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { interceptReport } from '../helpers';

// core implementation of this rule does not provide quick fixes
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, (context, reportDescriptor) => {
    const node = (reportDescriptor as any).node as estree.Node;
    const type = reportDescriptor.data!.type;
    let openingBrace: AST.Token;
    if (node.type === 'SwitchStatement') {
      openingBrace = context
        .getSourceCode()
        .getTokenAfter(node.discriminant, token => token.value === '{')!;
    } /* BlockStatement */ else {
      openingBrace = context.getSourceCode().getFirstToken(node)!;
    }
    const closingBrace = context.getSourceCode().getLastToken(node)!;
    suggestEmptyBlockQuickFix(context, reportDescriptor, type, openingBrace, closingBrace);
  });
}

export function suggestEmptyBlockQuickFix(
  context: Rule.RuleContext,
  descriptor: Rule.ReportDescriptor,
  blockType: string,
  openingBrace: AST.Token,
  closingBrace: AST.Token,
) {
  let commentPlaceholder: string;
  if (openingBrace.loc.start.line === closingBrace.loc.start.line) {
    commentPlaceholder = ` /* TODO document why this ${blockType} is empty */ `;
  } else {
    const columnOffset = closingBrace.loc.start.column;
    const padding = ' '.repeat(columnOffset);
    commentPlaceholder = `\n${padding}  // TODO document why this ${blockType} is empty\n${padding}`;
  }
  context.report({
    ...descriptor,
    suggest: [
      {
        desc: 'Insert placeholder comment',
        fix: fixer => fixer.insertTextAfter(openingBrace, commentPlaceholder),
      },
    ],
  });
}
