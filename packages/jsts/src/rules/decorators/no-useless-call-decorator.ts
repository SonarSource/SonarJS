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
// https://sonarsource.github.io/rspec/#/rspec/S6676/javascript

import { Rule, AST } from 'eslint';
import * as estree from 'estree';
import { interceptReport } from './helpers';

// core implementation of this rule does not provide quick fixes
export function decorateNoUselessCall(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  return interceptReport(rule, (context, reportDescriptor) => {
    const suggest: Rule.SuggestionReportDescriptor[] = [];
    const node = (reportDescriptor as any).node as estree.Node;

    if (node.type === 'CallExpression') {
      const callee = node.callee,
        args = node.arguments;

      if (callee.type === 'MemberExpression') {
        const object = callee.object,
          property = callee.property;

        if (property.type === 'Identifier' && property.name === 'call') {
          const desc = 'Remove redundant call()';

          if (args.length > 1) {
            addFixForCall(suggest, desc, object.range, args[1].range);
          } else {
            addFixForCallNoArgs(suggest, desc, object.range, node.range);
          }
        }

        if (property.type === 'Identifier' && property.name === 'apply') {
          const desc = 'Remove redundant apply()',
            argsText = context.sourceCode.getText(args[1], -1, -1);
          addFixForApply(suggest, desc, argsText, object.range, node.range);
        }
      }
    }

    context.report({ ...reportDescriptor, suggest });
  });
}

function addFixForCall(
  suggest: Rule.SuggestionReportDescriptor[],
  desc: string,
  startRange?: AST.Range,
  endRange?: AST.Range,
) {
  if (startRange && endRange) {
    suggest.push({
      desc,
      fix: fixer => fixer.replaceTextRange([startRange[1], endRange[0]], '('),
    });
  }
}

function addFixForCallNoArgs(
  suggest: Rule.SuggestionReportDescriptor[],
  desc: string,
  startRange?: AST.Range,
  endRange?: AST.Range,
) {
  if (startRange && endRange) {
    suggest.push({
      desc,
      fix: fixer => fixer.replaceTextRange([startRange[1], endRange[1]], '()'),
    });
  }
}

function addFixForApply(
  suggest: Rule.SuggestionReportDescriptor[],
  desc: string,
  argsText: string,
  startRange?: AST.Range,
  endRange?: AST.Range,
) {
  if (startRange && endRange) {
    suggest.push({
      desc,
      fix: fixer => fixer.replaceTextRange([startRange[1], endRange[1]], `(${argsText})`),
    });
  }
}
