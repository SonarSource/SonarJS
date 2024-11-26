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
// https://sonarsource.github.io/rspec/#/rspec/S4619/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, isArray, isNumber, isRequiredParserServices } from '../helpers/index.js';
import type { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      inMisuse: 'Use "indexOf" or "includes" (available from ES2016) instead.',
      suggestIndexOf: 'Replace with "indexOf" method',
      suggestIncludes: 'Replace with "includes" method',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;

    function prototypeProperty(node: estree.Expression) {
      const expr = node as TSESTree.Expression;
      if (expr.type !== 'Literal' || typeof expr.value !== 'string') {
        return false;
      }

      return ['indexOf', 'lastIndexOf', 'forEach', 'map', 'filter', 'every', 'some'].includes(
        expr.value,
      );
    }

    if (isRequiredParserServices(services)) {
      return {
        "BinaryExpression[operator='in']": (node: estree.Node) => {
          const { left, right } = node as estree.BinaryExpression;
          if (isArray(right, services) && !prototypeProperty(left) && !isNumber(left, services)) {
            const leftText = context.sourceCode.getText(left);
            const rightText = context.sourceCode.getText(right);
            context.report({
              messageId: 'inMisuse',
              node,
              suggest: [
                {
                  messageId: 'suggestIndexOf',
                  fix: fixer => fixer.replaceText(node, `${rightText}.indexOf(${leftText}) > -1`),
                },
                {
                  messageId: 'suggestIncludes',
                  fix: fixer => fixer.replaceText(node, `${rightText}.includes(${leftText})`),
                },
              ],
            });
          }
        },
      };
    }
    return {};
  },
};
