/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1479

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import type { FromSchema } from 'json-schema-to-ts';

const DEFAULT_MAX_SWITCH_CASES = 30;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      reduceNumberOfNonEmptySwitchCases:
        'Reduce the number of non-empty switch cases from {{numSwitchCases}} to at most {{maxSwitchCases}}.',
    },
  }),
  create(context) {
    const maxSwitchCases =
      (context.options as FromSchema<typeof meta.schema>)[0] ?? DEFAULT_MAX_SWITCH_CASES;
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
