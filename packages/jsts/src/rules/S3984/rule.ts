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
// https://sonarsource.github.io/rspec/#/rspec/S3984/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, getParent } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      throwOrRemoveError: 'Throw this error or remove this useless statement.',
      suggestThrowError: 'Throw this error',
    },
  }),
  create(context: Rule.RuleContext) {
    function looksLikeAnError(expression: estree.Expression | estree.Super): boolean {
      const text = context.sourceCode.getText(expression);
      return text.endsWith('Error') || text.endsWith('Exception');
    }

    return {
      'ExpressionStatement > NewExpression'(node: estree.Node) {
        const expression = (node as estree.NewExpression).callee;
        if (looksLikeAnError(expression)) {
          context.report({
            messageId: 'throwOrRemoveError',
            node,
            suggest: [
              {
                messageId: 'suggestThrowError',
                fix: fixer => fixer.insertTextBefore(getParent(context, node)!, 'throw '),
              },
            ],
          });
        }
      },
    };
  },
};
