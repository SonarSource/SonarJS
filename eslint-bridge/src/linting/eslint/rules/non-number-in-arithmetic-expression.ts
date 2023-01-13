/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3760/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import ts from 'typescript';
import {
  isRequiredParserServices,
  getTypeFromTreeNode,
  isStringType,
  toEncodedMessage,
} from './helpers';
import { SONAR_RUNTIME } from 'linting/eslint/linter/parameters';

const MESSAGE = 'Convert this operand into a number.';
export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      BinaryExpression: (node: estree.Node) => {
        const binaryExpression = node as estree.BinaryExpression;
        const operator = binaryExpression.operator;
        const leftType = getTypeFromTreeNode(binaryExpression.left, services);
        const rightType = getTypeFromTreeNode(binaryExpression.right, services);
        if (operator === '+') {
          checkPlus(leftType, rightType, binaryExpression, context);
        }
        if (operator === '<' || operator === '>' || operator === '<=' || operator === '>=') {
          checkComparison(leftType, rightType, binaryExpression, context);
        }
        if (operator === '-' || operator === '*' || operator === '/' || operator === '%') {
          checkArithmetic(leftType, rightType, binaryExpression, context);
        }
      },
      AssignmentExpression: (node: estree.Node) => {
        const assignmentExpression = node as estree.AssignmentExpression;
        const operator = assignmentExpression.operator;
        const leftType = getTypeFromTreeNode(assignmentExpression.left, services);
        const rightType = getTypeFromTreeNode(assignmentExpression.right, services);
        if (operator === '+=') {
          checkPlus(leftType, rightType, assignmentExpression, context);
        }
        if (operator === '-=' || operator === '*=' || operator === '/=' || operator === '%=') {
          checkArithmetic(leftType, rightType, assignmentExpression, context);
        }
      },
      'UnaryExpression[operator="-"]': (node: estree.Node) => {
        const unaryExpression = node as estree.UnaryExpression;
        const type = getTypeFromTreeNode(unaryExpression.argument, services);
        if (isBooleanStringOrDate(type)) {
          context.report({
            node: unaryExpression.argument,
            message: toEncodedMessage(MESSAGE, []),
          });
        }
      },
      UpdateExpression: (node: estree.Node) => {
        const updateExpression = node as estree.UpdateExpression;
        const type = getTypeFromTreeNode(updateExpression.argument, services);
        if (isBooleanStringOrDate(type)) {
          context.report({
            node: updateExpression.argument,
            message: toEncodedMessage(MESSAGE, []),
          });
        }
      },
    };
  },
};

function isDateMinusDateException(
  leftType: ts.Type,
  rightType: ts.Type,
  operator: estree.BinaryOperator | estree.AssignmentOperator,
) {
  if (operator !== '-' && operator !== '-=') {
    return false;
  }
  if (
    leftType.symbol?.name === 'Date' &&
    (rightType.symbol?.name === 'Date' || (rightType.flags & ts.TypeFlags.Any) > 0)
  ) {
    return true;
  }
  if (rightType.symbol?.name === 'Date' && (leftType.flags & ts.TypeFlags.Any) > 0) {
    return true;
  }
  return false;
}

function checkPlus(
  leftType: ts.Type,
  rightType: ts.Type,
  expression: estree.BinaryExpression | estree.AssignmentExpression,
  context: Rule.RuleContext,
) {
  if (isNumber(leftType) && isBooleanOrDate(rightType)) {
    context.report({
      node: expression.right,
      message: toEncodedMessage(MESSAGE, [expression.left]),
    });
  }
  if (isNumber(rightType) && isBooleanOrDate(leftType)) {
    context.report({
      node: expression.left,
      message: toEncodedMessage(MESSAGE, [expression.right]),
    });
  }
}

function checkComparison(
  leftType: ts.Type,
  rightType: ts.Type,
  expression: estree.BinaryExpression | estree.AssignmentExpression,
  context: Rule.RuleContext,
) {
  if (isBooleanOrNumber(leftType) && isBooleanStringOrDate(rightType)) {
    context.report({
      node: expression.right,
      message: toEncodedMessage(MESSAGE, []),
    });
  } else if (isBooleanOrNumber(rightType) && isBooleanStringOrDate(leftType)) {
    context.report({
      node: expression.left,
      message: toEncodedMessage(MESSAGE, []),
    });
  }
}

function checkArithmetic(
  leftType: ts.Type,
  rightType: ts.Type,
  expression: estree.BinaryExpression | estree.AssignmentExpression,
  context: Rule.RuleContext,
) {
  if (isDateMinusDateException(leftType, rightType, expression.operator)) {
    return;
  }
  const secondaryLocations = [];
  if (isBooleanStringOrDate(leftType)) {
    secondaryLocations.push(expression.left);
  }
  if (isBooleanStringOrDate(rightType)) {
    secondaryLocations.push(expression.right);
  }
  if (secondaryLocations.length !== 0) {
    context.report({
      node: expression,
      message: toEncodedMessage(
        'Convert the operands of this operation into numbers.',
        secondaryLocations,
      ),
    });
  }
}

function isBooleanOrDate(type: ts.Type) {
  if (isBoolean(type)) {
    return true;
  }
  return type.symbol?.name === 'Date';
}

function isBooleanOrNumber(type: ts.Type) {
  return isBoolean(type) || isNumber(type);
}

function isBoolean(type: ts.Type) {
  return (type.flags & ts.TypeFlags.BooleanLike) > 0 || type.symbol?.name === 'Boolean';
}

function isNumber(type: ts.Type) {
  return (type.flags & ts.TypeFlags.NumberLike) > 0 || type.symbol?.name === 'Number';
}

function isBooleanStringOrDate(type: ts.Type) {
  return isBoolean(type) || isStringType(type) || type.symbol?.name === 'Date';
}
