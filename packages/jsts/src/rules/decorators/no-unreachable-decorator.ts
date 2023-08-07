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
// https://sonarsource.github.io/rspec/#/rspec/S1763/javascript

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { interceptReport } from './helpers';
import { removeNodeWithLeadingWhitespaces } from '../helpers';

// core implementation of this rule does not provide quick fixes
export function decorateNoUnreachable(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, (context, reportDescriptor) => {
    const loc = (reportDescriptor as any).loc as AST.SourceLocation;
    const node = (reportDescriptor as any).node as estree.Node;
    context.report({
      ...reportDescriptor,
      suggest: [
        {
          desc: 'Remove unreachable code',
          fix: fixer =>
            removeNodeWithLeadingWhitespaces(
              context,
              node,
              fixer,
              context.getSourceCode().getIndexFromLoc(loc.end),
            ),
        },
      ],
    });
  });
}
