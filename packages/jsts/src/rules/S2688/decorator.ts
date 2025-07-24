/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S2688/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  interceptReport,
  isIdentifier,
  isMemberExpression,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

// core implementation of this rule does not provide quick fixes
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
      const suggest: Rule.SuggestionReportDescriptor[] = [];
      const node = (reportDescriptor as any).node as estree.Node;
      if (node.type === 'BinaryExpression') {
        const { left, operator, right } = node;
        let negate: boolean | null = null;
        switch (operator) {
          case '!=':
          case '!==':
            negate = true;
            break;
          case '==':
          case '===':
            negate = false;
            break;
        }
        if (negate !== null) {
          const arg = isNaNIdentifier(left) ? right : left;
          const argText = context.sourceCode.getText(arg);
          const prefix = negate ? '!' : '';
          suggest.push(
            {
              desc: 'Use "isNaN()"',
              fix: fixer => fixer.replaceText(node, `${prefix}isNaN(${argText})`),
            },
            {
              desc: 'Use "Number.isNaN()"',
              fix: fixer => fixer.replaceText(node, `${prefix}Number.isNaN(${argText})`),
            },
          );
        }
      }
      context.report({ ...reportDescriptor, suggest });
    },
  );
}

function isNaNIdentifier(node: estree.Node) {
  return isIdentifier(node, 'NaN') || isMemberExpression(node, 'Number', 'NaN');
}
