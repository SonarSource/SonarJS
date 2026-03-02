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
// https://sonarsource.github.io/rspec/#/rspec/S6679/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { areEquivalent, generateMeta, getNodeParent, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Checks if a self-comparison node is part of a dual-NaN equality check pattern:
 * `a !== a && b !== b` — an intentional idiom to check if both values are NaN.
 */
function isDualNaNCheck(node: estree.BinaryExpression, context: Rule.RuleContext): boolean {
  const parent = getNodeParent(node);
  if (parent?.type !== 'LogicalExpression' || parent.operator !== '&&') {
    return false;
  }
  const sibling = parent.left === node ? parent.right : parent.left;
  if (sibling.type !== 'BinaryExpression') {
    return false;
  }
  // Sibling must be a self-comparison of a different variable
  return (
    areEquivalent(sibling.left, sibling.right, context.sourceCode) &&
    !areEquivalent(node.left, sibling.left, context.sourceCode)
  );
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
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
          if (isDualNaNCheck(node, context)) {
            return;
          }

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
