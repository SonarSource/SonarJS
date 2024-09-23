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
// https://sonarsource.github.io/rspec/#/rspec/S2251/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    return {
      ForStatement: (node: estree.Node) => {
        const forStatement: estree.ForStatement = node as estree.ForStatement;
        const test = forStatement.test;
        const loopIncrement: ForLoopIncrement | null =
          ForLoopIncrement.findInLoopUpdate(forStatement);
        if (test == null || loopIncrement == null || forStatement.update == null) {
          return;
        }
        const wrongDirection = getWrongDirection(test, loopIncrement);
        if (wrongDirection !== 0 && wrongDirection === loopIncrement.direction) {
          const movement: string = wrongDirection > 0 ? 'incremented' : 'decremented';
          report(
            context,
            {
              message: `"${loopIncrement.identifier.name}" is ${movement} and will never reach its stop condition.`,
              node: forStatement.update,
            },
            [toSecondaryLocation(test)],
          );
        }
      },
    };
  },
};

class ForLoopIncrement {
  increment: estree.Expression;
  identifier: estree.Identifier;
  direction: number;

  constructor(increment: estree.Expression, identifier: estree.Identifier, direction: number) {
    this.increment = increment;
    this.identifier = identifier;
    this.direction = direction;
  }

  static findInLoopUpdate(forStatement: estree.ForStatement) {
    let result = null;
    const expression = forStatement.update;
    if (!expression) {
      return null;
    }
    if (expression.type === 'UpdateExpression') {
      const updateExpression: estree.UpdateExpression = expression;
      const direction: number = updateExpression.operator === '++' ? 1 : -1;
      result = ForLoopIncrement.increment(updateExpression, updateExpression.argument, direction);
    }
    if (expression.type === 'AssignmentExpression') {
      const assignmentExpression: estree.AssignmentExpression = expression;
      if (
        assignmentExpression.operator === '+=' &&
        assignmentExpression.left.type === 'Identifier'
      ) {
        result = ForLoopIncrement.increment(
          expression,
          assignmentExpression.left,
          directionFromValue(assignmentExpression.right),
        );
      }
      if (
        assignmentExpression.operator === '-=' &&
        assignmentExpression.left.type === 'Identifier'
      ) {
        result = ForLoopIncrement.increment(
          expression,
          assignmentExpression.left,
          -directionFromValue(assignmentExpression.right),
        );
      }
      if (assignmentExpression.operator === '=') {
        result = ForLoopIncrement.assignmentIncrement(assignmentExpression);
      }
    }
    return result;
  }

  private static increment(
    increment: estree.Expression,
    expression: estree.Expression,
    direction: number,
  ) {
    if (expression.type === 'Identifier') {
      return new ForLoopIncrement(increment, expression, direction);
    }
    return null;
  }

  private static assignmentIncrement(assignmentExpression: estree.AssignmentExpression) {
    const lhs = assignmentExpression.left;
    const rhs = assignmentExpression.right;
    if (
      lhs.type === 'Identifier' &&
      rhs.type === 'BinaryExpression' &&
      (rhs.operator === '+' || rhs.operator === '-')
    ) {
      let incrementDirection = directionFromValue(rhs.right);
      if (incrementDirection !== null && isSameIdentifier(rhs.left, lhs)) {
        incrementDirection = rhs.operator === '-' ? -incrementDirection : incrementDirection;
        return ForLoopIncrement.increment(assignmentExpression, lhs, incrementDirection);
      }
    }
    return null;
  }
}

function directionFromValue(expression: estree.Expression): number {
  if (expression.type === 'Literal') {
    const value = Number(expression.raw);
    if (isNaN(value) || value === 0) {
      return 0;
    }
    return value > 0 ? 1 : -1;
  }
  if (expression.type === 'UnaryExpression') {
    const unaryExpression: estree.UnaryExpression = expression;
    if (unaryExpression.operator === '+') {
      return directionFromValue(unaryExpression.argument);
    }
    if (unaryExpression.operator === '-') {
      return -directionFromValue(unaryExpression.argument);
    }
  }
  return 0;
}

function getWrongDirection(
  condition: estree.Expression,
  forLoopIncrement: ForLoopIncrement,
): number {
  if (condition.type !== 'BinaryExpression') {
    return 0;
  }
  if (isSameIdentifier(condition.left, forLoopIncrement.identifier)) {
    if (condition.operator === '<' || condition.operator === '<=') {
      return -1;
    }
    if (condition.operator === '>' || condition.operator === '>=') {
      return +1;
    }
  } else if (isSameIdentifier(condition.right, forLoopIncrement.identifier)) {
    if (condition.operator === '<' || condition.operator === '<=') {
      return +1;
    }
    if (condition.operator === '>' || condition.operator === '>=') {
      return -1;
    }
  }
  return 0;
}

function isSameIdentifier(expression: estree.Expression, identifier: estree.Identifier) {
  return expression.type === 'Identifier' && expression.name === identifier.name;
}
