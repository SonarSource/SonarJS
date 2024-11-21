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
// https://sonarsource.github.io/rspec/#/rspec/S6426/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isIdentifier, isMethodCall } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      issue: 'Remove ".only()" from your test case.',
      quickfix: 'Remove ."only()".',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression: (node: estree.CallExpression) => {
        if (isMethodCall(node)) {
          const { property, object } = node.callee;
          if (isIdentifier(property, 'only') && isIdentifier(object, 'describe', 'it', 'test')) {
            context.report({
              messageId: 'issue',
              node: property,
              suggest: [
                {
                  fix: (fixer: Rule.RuleFixer) => {
                    const fixes = [fixer.remove(property)];
                    const dotBeforeOnly = context.sourceCode.getTokenBefore(property);
                    if (dotBeforeOnly != null) {
                      fixes.push(fixer.remove(dotBeforeOnly));
                    }
                    return fixes;
                  },
                  messageId: 'quickfix',
                },
              ],
            });
          }
        }
      },
    };
  },
};
