/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1479

import { Rule } from 'eslint';
import { docsUrl } from '../helpers';
import estree from 'estree';

const DEFAULT_MAX_SWITCH_CASES = 30;

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      reduceNumberOfNonEmptySwitchCases:
        'Reduce the number of non-empty switch cases from {{numSwitchCases}} to at most {{maxSwitchCases}}.',
    },
    type: 'suggestion',
    docs: {
      description: '"switch" statements should not have too many "case" clauses',
      recommended: true,
      url: docsUrl(__filename),
    },
    schema: [
      {
        type: 'integer',
        minimum: 0,
      },
    ],
  },
  create(context) {
    const maxSwitchCases: number =
      typeof context.options[0] === 'number' ? context.options[0] : DEFAULT_MAX_SWITCH_CASES;
    return {
      SwitchStatement: (node: estree.SwitchStatement) =>
        visitSwitchStatement(node, context, maxSwitchCases),
    };
  },
};

function visitSwitchStatement(
  switchStatement: estree.SwitchStatement,
  context: Rule.RuleContext,
  maxSwitchCases: number,
) {
  const nonEmptyCases = switchStatement.cases.filter(
    switchCase => switchCase.consequent.length > 0 && !isDefaultCase(switchCase),
  );
  if (nonEmptyCases.length > maxSwitchCases) {
    const switchKeyword = context.sourceCode.getFirstToken(switchStatement)!;
    context.report({
      messageId: 'reduceNumberOfNonEmptySwitchCases',
      loc: switchKeyword.loc,
      data: {
        numSwitchCases: nonEmptyCases.length.toString(),
        maxSwitchCases: maxSwitchCases.toString(),
      },
    });
  }
}

function isDefaultCase(switchCase: estree.SwitchCase) {
  return switchCase.test === null;
}
