/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6679/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

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
      if ('node' in reportDescriptor && 'messageId' in reportDescriptor) {
        const { node, messageId, ...rest } = reportDescriptor,
          operators = new Set(['===', '==', '!==', '!=']);

        if (
          node.type === 'BinaryExpression' &&
          operators.has(node.operator) &&
          node.left.type !== 'Literal'
        ) {
          const prefix = node.operator.startsWith('!') ? '' : '!',
            value = context.sourceCode.getText(node.left),
            suggest: Rule.SuggestionReportDescriptor[] = [
              {
                desc: 'Replace self-compare with Number.isNaN()',
                fix: fixer => fixer.replaceText(node, `${prefix}Number.isNaN(${value})`),
              },
            ];

          context.report({
            node,
            message: "Use 'Number.isNaN()' to check for 'NaN' value",
            ...rest,
            suggest,
          });
        }
      }
    },
  );
}
