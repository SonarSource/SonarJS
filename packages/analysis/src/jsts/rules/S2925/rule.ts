/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S2925/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  getUniqueWriteUsage,
  isIdentifier,
  isMethodCall,
  isNumberLiteral,
} from '../helpers/ast.js';
import { chainStartsWithCy } from '../helpers/cypress.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isTestRelatedFile } from '../helpers/test-file-pattern.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      fixedWait: 'Replace this fixed wait with a synchronization on an observable condition.',
      debugPause: 'Remove this debug pause from the test.',
    },
  }),
  create(context: Rule.RuleContext) {
    if (!isTestRelatedFile(context.filename, context.settings?.testFileExtensions as string[])) {
      return {};
    }

    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        if (!isMethodCall(call)) {
          return;
        }

        const property = call.callee.property;
        const methodName = property.name;
        if (methodName === 'wait' && chainStartsWithCy(call.callee.object)) {
          reportCypressWait(context, call, property);
        } else if (
          (methodName === 'pause' || methodName === 'debug') &&
          chainStartsWithCy(call.callee.object)
        ) {
          report(context, property, 'debugPause');
        } else if (methodName === 'waitForTimeout' && isIdentifier(call.callee.object, 'page')) {
          report(context, property, 'fixedWait');
        } else if (methodName === 'pause' && isIdentifier(call.callee.object, 'page')) {
          report(context, property, 'debugPause');
        }
      },
      NewExpression(node: estree.Node) {
        reportPromiseSetTimeout(context, node as estree.NewExpression);
      },
    };
  },
};

function reportPromiseSetTimeout(context: Rule.RuleContext, node: estree.NewExpression) {
  if (!isIdentifier(node.callee, 'Promise')) {
    return;
  }
  const [executor] = node.arguments;
  if (
    !executor ||
    (executor.type !== 'ArrowFunctionExpression' && executor.type !== 'FunctionExpression')
  ) {
    return;
  }
  const [resolveParam] = executor.params;
  if (!resolveParam || resolveParam.type !== 'Identifier') {
    return;
  }
  const resolveName = resolveParam.name;

  const setTimeoutCall = findSetTimeoutCallInExecutorBody(executor.body, resolveName);
  if (!setTimeoutCall) {
    return;
  }

  const delayArg = setTimeoutCall.arguments[1];
  if (!delayArg) {
    return;
  }
  if (isNumericLiteralOrUnaryNumericLiteral(delayArg)) {
    report(context, setTimeoutCall, 'fixedWait');
    return;
  }
  if (delayArg.type === 'Identifier') {
    const resolved = getUniqueWriteUsage(context, delayArg.name, delayArg);
    if (resolved && isNumericLiteralOrUnaryNumericLiteral(resolved)) {
      report(context, setTimeoutCall, 'fixedWait');
    }
  }
}

function findSetTimeoutCallInExecutorBody(
  body: estree.BlockStatement | estree.Expression,
  resolveName: string,
): estree.CallExpression | undefined {
  if (body.type === 'BlockStatement') {
    if (body.body.length !== 1) {
      return undefined;
    }
    const statement = body.body[0];
    if (statement.type !== 'ExpressionStatement') {
      return undefined;
    }
    return matchSetTimeoutCall(statement.expression, resolveName);
  }
  return matchSetTimeoutCall(body, resolveName);
}

function matchSetTimeoutCall(
  expression: estree.Node,
  resolveName: string,
): estree.CallExpression | undefined {
  if (expression.type !== 'CallExpression') {
    return undefined;
  }
  if (!isIdentifier(expression.callee, 'setTimeout')) {
    return undefined;
  }
  const [callback] = expression.arguments;
  if (!callback || !isIdentifier(callback, resolveName)) {
    return undefined;
  }
  return expression;
}

function reportCypressWait(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  reportNode: estree.Node,
) {
  const [firstArgument] = call.arguments;
  if (!firstArgument) {
    return;
  }
  if (isNumericLiteralOrUnaryNumericLiteral(firstArgument)) {
    report(context, reportNode, 'fixedWait');
    return;
  }
  if (firstArgument.type === 'Identifier') {
    const resolved = getUniqueWriteUsage(context, firstArgument.name, firstArgument);
    if (resolved && isNumericLiteralOrUnaryNumericLiteral(resolved)) {
      report(context, reportNode, 'fixedWait');
    }
  }
}

function isNumericLiteralOrUnaryNumericLiteral(node: estree.Node) {
  return (
    isNumberLiteral(node) ||
    (node.type === 'UnaryExpression' &&
      (node.operator === '+' || node.operator === '-') &&
      isNumberLiteral(node.argument))
  );
}

function report(context: Rule.RuleContext, node: estree.Node, messageId: 'fixedWait' | 'debugPause') {
  context.report({
    node,
    messageId,
  });
}
