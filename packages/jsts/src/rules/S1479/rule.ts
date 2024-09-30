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
// https://sonarsource.github.io/rspec/#/rspec/S1479

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta, schema } from './meta.js';
import { FromSchema } from 'json-schema-to-ts';

const DEFAULT_MAX_SWITCH_CASES = 30;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      reduceNumberOfNonEmptySwitchCases:
        'Reduce the number of non-empty switch cases from {{numSwitchCases}} to at most {{maxSwitchCases}}.',
    },
    schema,
  }),
  create(context) {
    const maxSwitchCases =
      (context.options as FromSchema<typeof schema>)[0] ?? DEFAULT_MAX_SWITCH_CASES;
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
