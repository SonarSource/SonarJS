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
import { getVariableFromName } from "./utils";

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
          !isException(forStatement, context)
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

function isException(forStatement: estree.ForStatement, context: Rule.RuleContext) {
  return (
    isNontrivialConditionException(forStatement) ||
    isTrivialIteratorException(forStatement, context)
  );
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

function isTrivialIteratorException(forStatement: estree.ForStatement, context: Rule.RuleContext) {
  const init = forStatement.init;
  const condition = forStatement.test;
  const update = forStatement.update;

  if (init && condition && update && isNotEqual(condition)) {
    const updatedByOne = checkForUpdateByOne(update, forStatement.body, context);

    if (updatedByOne !== 0) {
      const beginValue = getValue(init);
      const endValue = getValue(condition);
      return (
        beginValue !== undefined &&
        endValue !== undefined &&
        updatedByOne === Math.sign(endValue - beginValue)
      );
    }
  }

  return false;
}

function isNotEqual(node: estree.Node | undefined | null): node is estree.BinaryExpression {
  return !!(node && node.type === "BinaryExpression" && node.operator === "!=");
}

function checkForUpdateByOne(
  update: estree.Expression,
  loopBody: estree.Node,
  context: Rule.RuleContext,
) {
  if (isUpdateByOne(update, loopBody, context)) {
    if (update.operator === "++" || update.operator === "+=") {
      return +1;
    }
    if (update.operator === "--" || update.operator === "-=") {
      return -1;
    }
  }
  return 0;
}

function isUpdateByOne(
  update: estree.Expression,
  loopBody: estree.Node,
  context: Rule.RuleContext,
): update is estree.UpdateExpression | estree.AssignmentExpression {
  return (
    (update.type === "UpdateExpression" && !isUsedInsideBody(update.argument, loopBody, context)) ||
    (isUpdateOnOneWithAssign(update) && !isUsedInsideBody(update.left, loopBody, context))
  );
}

function isUsedInsideBody(id: estree.Node, loopBody: estree.Node, context: Rule.RuleContext) {
  if (id.type === "Identifier") {
    const variable = getVariableFromName(context, id.name);
    const bodyRange = loopBody.range;
    if (variable && bodyRange) {
      return variable.references.some(ref => isInBody(ref.identifier, bodyRange));
    }
  }
  return false;
}

function isInBody(id: estree.Identifier, bodyRange: [number, number]) {
  return id && id.range && id.range[0] > bodyRange[0] && id.range[1] < bodyRange[1];
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
