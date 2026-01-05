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
// https://sonarsource.github.io/rspec/#/rspec/S1125

import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isBooleanLiteral } from '../helpers/index.js';
import type { Rule } from 'eslint';
import type estree from 'estree';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      removeUnnecessaryBoolean: 'Refactor the code to avoid using this boolean literal.',
      suggestRemoveUnnecessaryBoolean: 'Remove the unnecessary boolean literal',
    },
  }),
  create(context) {
    return {
      BinaryExpression(expression: estree.BinaryExpression) {
        if (expression.operator === '==' || expression.operator === '!=') {
          checkBinaryExpression(expression);
        }
      },

      LogicalExpression(expression: estree.LogicalExpression) {
        checkLogicalExpression(expression);
      },

      UnaryExpression(unaryExpression: estree.UnaryExpression) {
        if (unaryExpression.operator === '!') {
          checkUnaryExpression(unaryExpression);
        }
      },
    };

    function checkBinaryExpression(expression: estree.BinaryExpression) {
      const { left, right, operator } = expression;
      if (isBooleanLiteral(left)) {
        reportWithFix(left, fixer => getBinaryFix(fixer, expression, left, right, operator));
      }
      if (isBooleanLiteral(right)) {
        reportWithFix(right, fixer => getBinaryFix(fixer, expression, right, left, operator));
      }
    }

    function getBinaryFix(
      fixer: Rule.RuleFixer,
      expression: estree.BinaryExpression,
      booleanLiteral: estree.Literal,
      otherOperand: estree.Expression | estree.PrivateIdentifier,
      operator: string,
    ): Rule.Fix {
      const booleanValue = booleanLiteral.value as boolean;
      const otherText = context.sourceCode.getText(otherOperand as estree.Node);

      // x == true -> x, x == false -> !x, x != true -> !x, x != false -> x
      const shouldNegate =
        (operator === '==' && !booleanValue) || (operator === '!=' && booleanValue);

      const replacement = shouldNegate ? `!${otherText}` : otherText;
      return fixer.replaceText(expression, replacement);
    }

    function checkLogicalExpression(expression: estree.LogicalExpression) {
      const { left, right, operator } = expression;

      if (isBooleanLiteral(left)) {
        reportWithFix(left, fixer => getLogicalFix(fixer, expression, left, right, operator));
      }

      if (operator === '&&' && isBooleanLiteral(right)) {
        reportWithFix(right, fixer => getLogicalFix(fixer, expression, right, left, operator));
      }

      // ignore `x || true` and `x || false` expressions outside of conditional expressions and `if` statements
      const parent = (expression as TSESTree.Node).parent as estree.Node;
      if (
        operator === '||' &&
        isBooleanLiteral(right) &&
        ((parent.type === 'ConditionalExpression' && parent.test === expression) ||
          parent.type === 'IfStatement')
      ) {
        reportWithFix(right, fixer => getLogicalFix(fixer, expression, right, left, operator));
      }
    }

    function getLogicalFix(
      fixer: Rule.RuleFixer,
      expression: estree.LogicalExpression,
      booleanLiteral: estree.Literal,
      otherOperand: estree.Expression,
      operator: string,
    ): Rule.Fix {
      const booleanValue = booleanLiteral.value as boolean;
      const otherText = context.sourceCode.getText(otherOperand);

      let replacement: string;
      if (operator === '&&') {
        // true && x -> x, false && x -> false, x && true -> x, x && false -> false
        replacement = booleanValue ? otherText : 'false';
      } else {
        // || operator
        // true || x -> true, false || x -> x, x || true -> true, x || false -> x
        replacement = booleanValue ? 'true' : otherText;
      }

      return fixer.replaceText(expression, replacement);
    }

    function checkUnaryExpression(unaryExpression: estree.UnaryExpression) {
      const { argument } = unaryExpression;
      if (isBooleanLiteral(argument)) {
        reportWithFix(argument, fixer => {
          const booleanValue = (argument as estree.Literal).value as boolean;
          const replacement = booleanValue ? 'false' : 'true';
          return fixer.replaceText(unaryExpression, replacement);
        });
      }
    }

    function reportWithFix(node: estree.Node, fix: (fixer: Rule.RuleFixer) => Rule.Fix) {
      context.report({
        messageId: 'removeUnnecessaryBoolean',
        node,
        suggest: [
          {
            messageId: 'suggestRemoveUnnecessaryBoolean',
            fix,
          },
        ],
      });
    }
  },
};
