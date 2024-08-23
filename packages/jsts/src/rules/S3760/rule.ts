/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  isStringType,
  IssueLocation,
  report,
  toSecondaryLocation,
} from '../helpers';
import { meta } from './meta';

const MESSAGE = 'Convert this operand into a number.';
export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
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
          report(context, {
            node: unaryExpression.argument,
            message: MESSAGE,
          });
        }
      },
      UpdateExpression: (node: estree.Node) => {
        const updateExpression = node as estree.UpdateExpression;
        const type = getTypeFromTreeNode(updateExpression.argument, services);
        if (isBooleanStringOrDate(type)) {
          report(context, {
            node: updateExpression.argument,
            message: MESSAGE,
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
    report(
      context,
      {
        node: expression.right,
        message: MESSAGE,
      },
      [toSecondaryLocation(expression.left)],
    );
  }
  if (isNumber(rightType) && isBooleanOrDate(leftType)) {
    report(
      context,
      {
        node: expression.left,
        message: MESSAGE,
      },
      [toSecondaryLocation(expression.right)],
    );
  }
}

function checkComparison(
  leftType: ts.Type,
  rightType: ts.Type,
  expression: estree.BinaryExpression | estree.AssignmentExpression,
  context: Rule.RuleContext,
) {
  if (isBooleanOrNumber(leftType) && isBooleanStringOrDate(rightType)) {
    report(context, {
      node: expression.right,
      message: MESSAGE,
    });
  } else if (isBooleanOrNumber(rightType) && isBooleanStringOrDate(leftType)) {
    report(context, {
      node: expression.left,
      message: MESSAGE,
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
  const secondaryLocations: IssueLocation[] = [];
  if (isBooleanStringOrDate(leftType)) {
    secondaryLocations.push(toSecondaryLocation(expression.left));
  }
  if (isBooleanStringOrDate(rightType)) {
    secondaryLocations.push(toSecondaryLocation(expression.right));
  }
  if (secondaryLocations.length !== 0) {
    report(
      context,
      {
        node: expression,
        message: 'Convert the operands of this operation into numbers.',
      },
      secondaryLocations,
    );
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
