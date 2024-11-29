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
// https://sonarsource.github.io/rspec/#/rspec/S1125

import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isBooleanLiteral } from '../helpers/index.js';
import type { Rule } from 'eslint';
import estree from 'estree';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeUnnecessaryBoolean: 'Refactor the code to avoid using this boolean literal.',
    },
  }),
  create(context) {
    return {
      BinaryExpression(expression: estree.BinaryExpression) {
        if (expression.operator === '==' || expression.operator === '!=') {
          checkBooleanLiteral(expression.left);
          checkBooleanLiteral(expression.right);
        }
      },

      LogicalExpression(expression: estree.LogicalExpression) {
        checkBooleanLiteral(expression.left);

        if (expression.operator === '&&') {
          checkBooleanLiteral(expression.right);
        }

        // ignore `x || true` and `x || false` expressions outside of conditional expressions and `if` statements
        const parent = (expression as TSESTree.Node).parent as estree.Node;
        if (
          expression.operator === '||' &&
          ((parent.type === 'ConditionalExpression' && parent.test === expression) ||
            parent.type === 'IfStatement')
        ) {
          checkBooleanLiteral(expression.right);
        }
      },

      UnaryExpression(unaryExpression: estree.UnaryExpression) {
        if (unaryExpression.operator === '!') {
          checkBooleanLiteral(unaryExpression.argument);
        }
      },
    };

    function checkBooleanLiteral(expression: estree.Expression | estree.PrivateIdentifier) {
      if (isBooleanLiteral(expression)) {
        context.report({ messageId: 'removeUnnecessaryBoolean', node: expression });
      }
    }
  },
};
