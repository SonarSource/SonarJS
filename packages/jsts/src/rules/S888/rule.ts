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
// https://sonarsource.github.io/rspec/#/rspec/S888/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getVariableFromName } from '../helpers';

const allEqualityOperators = ['!=', '==', '!==', '==='];
const notEqualOperators = ['!==', '!='];
const plusMinusOperators = ['+=', '-='];

interface CompleteForStatement extends estree.BaseStatement {
  type: 'ForStatement';
  init?: estree.VariableDeclaration | estree.Expression | null;
  test: estree.Expression;
  update: estree.Expression;
  body: estree.Statement;
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      replaceOperator:
        "Replace '{{operator}}' operator with one of '<=', '>=', '<', or '>' comparison operators.",
    },
  },
  create(context: Rule.RuleContext) {
    return {
      ForStatement: (node: estree.Node) => {
        const forStatement = node as estree.ForStatement;
        if (!forStatement.test || !forStatement.update) {
          return;
        }
        const completeForStatement = node as CompleteForStatement;
        const condition = completeForStatement.test;
        if (
          isEquality(condition) &&
          isUpdateIncDec(completeForStatement.update) &&
          !isException(completeForStatement, context)
        ) {
          context.report({
            messageId: 'replaceOperator',
            data: {
              operator: condition.operator,
            },
            node: condition,
          });
        }
      },
    };
  },
};

function isEquality(expression: estree.Expression): expression is estree.BinaryExpression {
  return (
    expression.type === 'BinaryExpression' && allEqualityOperators.includes(expression.operator)
  );
}

function isUpdateIncDec(expression: estree.Expression): boolean {
  if (isIncDec(expression) || expression.type === 'UpdateExpression') {
    return true;
  } else if (expression.type === 'SequenceExpression') {
    return expression.expressions.every(isUpdateIncDec);
  }
  return false;
}

function isIncDec(expression: estree.Expression): expression is estree.AssignmentExpression {
  return (
    expression.type === 'AssignmentExpression' && plusMinusOperators.includes(expression.operator)
  );
}

function isException(forStatement: CompleteForStatement, context: Rule.RuleContext) {
  return (
    isNontrivialConditionException(forStatement) ||
    isTrivialIteratorException(forStatement, context)
  );
}

function isNontrivialConditionException(forStatement: CompleteForStatement) {
  //If we reach this point, we know that test is an equality kind
  const condition = forStatement.test as estree.BinaryExpression;
  const counters: Array<string> = [];
  collectCounters(forStatement.update, counters);
  return condition.left.type !== 'Identifier' || !counters.includes(condition.left.name);
}

function collectCounters(expression: estree.Expression, counters: Array<string>) {
  let counter: estree.Node | null | undefined = undefined;

  if (isIncDec(expression)) {
    counter = expression.left;
  } else if (expression.type === 'UpdateExpression') {
    counter = expression.argument;
  } else if (expression.type === 'SequenceExpression') {
    expression.expressions.forEach(e => collectCounters(e, counters));
  }

  if (counter && counter.type === 'Identifier') {
    counters.push(counter.name);
  }
}

function isTrivialIteratorException(forStatement: CompleteForStatement, context: Rule.RuleContext) {
  const init = forStatement.init;
  const condition = forStatement.test;

  if (init && isNotEqual(condition)) {
    const updatedByOne = checkForUpdateByOne(forStatement.update, forStatement.body, context);
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

function isNotEqual(node: estree.Node): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && notEqualOperators.includes(node.operator);
}

function checkForUpdateByOne(
  update: estree.Expression,
  loopBody: estree.Node,
  context: Rule.RuleContext,
) {
  if (isUpdateByOne(update, loopBody, context)) {
    if (update.operator === '++' || update.operator === '+=') {
      return +1;
    }
    if (update.operator === '--' || update.operator === '-=') {
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
    (update.type === 'UpdateExpression' && !isUsedInsideBody(update.argument, loopBody, context)) ||
    (isUpdateOnOneWithAssign(update) && !isUsedInsideBody(update.left, loopBody, context))
  );
}

function isUsedInsideBody(id: estree.Node, loopBody: estree.Node, context: Rule.RuleContext) {
  if (id.type === 'Identifier') {
    const variable = getVariableFromName(context, id.name);
    const bodyRange = loopBody.range;
    if (variable && bodyRange) {
      return variable.references.some(ref => isInBody(ref.identifier, bodyRange));
    }
  }
  return false;
}

function isInBody(id: estree.Identifier, bodyRange: [number, number]) {
  return id?.range && id.range[0] > bodyRange[0] && id.range[1] < bodyRange[1];
}

function getValue(node: estree.Node) {
  if (isNotEqual(node)) {
    return getInteger(node.right);
  } else if (isOneVarDeclaration(node)) {
    const variable = node.declarations[0];
    return getInteger(variable.init);
  } else if (node.type === 'AssignmentExpression') {
    return getInteger(node.right);
  }
  return undefined;
}

function getInteger(node: estree.Node | undefined | null) {
  if (node && node.type === 'Literal' && typeof node.value === 'number') {
    return node.value;
  }
  return undefined;
}

function isOneVarDeclaration(node: estree.Node): node is estree.VariableDeclaration {
  return node.type === 'VariableDeclaration' && node.declarations.length === 1;
}

function isUpdateOnOneWithAssign(
  expression: estree.Expression,
): expression is estree.AssignmentExpression {
  if (isIncDec(expression)) {
    const right = expression.right;
    return right.type === 'Literal' && right.value === 1;
  }
  return false;
}
