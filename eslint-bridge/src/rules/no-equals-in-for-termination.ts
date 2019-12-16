/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-888

import { Rule } from "eslint";
import * as estree from "estree";

const equalityOperator = ["!=", "=="];
const plusMinusOperator = ["+=", "-="];
const equalityKind = ["!==", "===", ...equalityOperator];

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      ForStatement: (node: estree.Node) => {
        const forStatement = node as estree.ForStatement;
        const condition = forStatement.test;
        if (
          isEquality(condition) &&
          isUpdateIncDec(forStatement.update) &&
          !isException(forStatement)
        ) {
          context.report({
            message: `Replace '${
              condition.operator
            }' operator with one of '<=', '>=', '<', or '>' comparison operators.`,
            node: condition,
          });
        }
      },
    };
  },
};

function isEquality(
  expression: estree.Expression | null | undefined,
): expression is estree.BinaryExpression {
  return !!(
    expression &&
    expression.type === "BinaryExpression" &&
    equalityOperator.includes(expression.operator)
  );
}

function isUpdateIncDec(expression: estree.Expression | null | undefined): boolean {
  if (expression) {
    if (isIncDec(expression) || expression.type === "UpdateExpression") {
      return true;
    } else if (expression.type === "SequenceExpression") {
      return expression.expressions.every(isUpdateIncDec);
    }
  }
  return false;
}

function isIncDec(
  expression: estree.Expression | null | undefined,
): expression is estree.AssignmentExpression {
  return !!(
    expression &&
    expression.type === "AssignmentExpression" &&
    plusMinusOperator.includes(expression.operator)
  );
}

function isException(forStatement: estree.ForStatement) {
  return isNontrivialConditionException(forStatement) || isTrivialIteratorException(forStatement);
}

function isNontrivialConditionException(forStatement: estree.ForStatement) {
  const condition = forStatement.test;
  const update = forStatement.update;
  if (condition && update && isEqualityKind(condition)) {
    var counters: Array<string> = [];
    collectCounters(update, counters);
    return condition.left.type !== "Identifier" || !counters.includes(condition.left.name);
  }
  return false;
}

function isEqualityKind(
  expression?: estree.Expression | null,
): expression is estree.BinaryExpression {
  return !!(
    expression &&
    expression.type === "BinaryExpression" &&
    equalityKind.includes(expression.operator)
  );
}

function collectCounters(
  expression: estree.Expression | null | undefined,
  counters: Array<string>,
) {
  let counter: estree.Node | undefined = undefined;

  if (expression) {
    if (isIncDec(expression)) {
      counter = expression.left;
    } else if (expression.type === "UpdateExpression") {
      counter = expression.argument;
    } else if (expression.type === "SequenceExpression") {
      expression.expressions.forEach(e => collectCounters(e, counters));
    }
  }

  if (counter && counter.type === "Identifier") {
    counters.push(counter.name);
  }
}

function isTrivialIteratorException(forStatement: estree.ForStatement) {
  const condition = forStatement.test;
  if (isNotEqual(condition)) {
    const update = forStatement.update;
    const init = forStatement.init;
    if (update && init) {
      return checkForTrivialIteratorException(init, condition, update);
    }
  }
  return false;
}

function isNotEqual(node: estree.Node | undefined | null): node is estree.BinaryExpression {
  return !!(node && node.type === "BinaryExpression" && node.operator === "!=");
}

function checkForTrivialIteratorException(
  init: estree.Node,
  condition: estree.Expression,
  update: estree.Expression,
) {
  const updatedByOne = checkForUpdateByOne(update);

  if (updatedByOne !== 0) {
    const beginValue = getValue(init);
    const endValue = getValue(condition);
    return (
      beginValue !== undefined &&
      endValue !== undefined &&
      updatedByOne === Math.sign(endValue - beginValue)
    );
  }
  return false;
}

function checkForUpdateByOne(update: estree.Expression) {
  if (update.type === "UpdateExpression" || isUpdateOnOneWithAssign(update)) {
    if (update.operator === "++" || update.operator === "+=") {
      return +1;
    }
    if (update.operator === "--" || update.operator === "-=") {
      return -1;
    }
  }
  return 0;
}

function getValue(node: estree.Node) {
  if (isNotEqual(node)) {
    return getInteger(node.right);
  } else if (isOneVarDeclaration(node)) {
    const variable = node.declarations[0];
    return getInteger(variable.init);
  } else if (node.type === "AssignmentExpression") {
    return getInteger(node.right);
  }
  return undefined;
}

function getInteger(expression: estree.Expression | null | undefined) {
  if (expression && expression.type === "Literal" && typeof expression.value === "number") {
    return expression.value;
  }
  return undefined;
}

function isOneVarDeclaration(node: estree.Node): node is estree.VariableDeclaration {
  return node.type === "VariableDeclaration" && node.declarations.length === 1;
}

function isUpdateOnOneWithAssign(
  expression: estree.Expression,
): expression is estree.AssignmentExpression {
  if (isIncDec(expression)) {
    const right = expression.right;
    return right.type === "Literal" && right.value === 1;
  }
  return false;
}
