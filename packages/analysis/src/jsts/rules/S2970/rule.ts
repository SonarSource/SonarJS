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
// https://sonarsource.github.io/rspec/#/rspec/S2970/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { isIdentifier, isNumberLiteral } from '../helpers/ast.js';
import * as meta from './generated-meta.js';
import {
  assertionFunctions,
  expectStaticMethods,
  gettersOrModifiers,
} from './matchers.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    return {
      ExpressionStatement(node: estree.Node) {
        const exprStatement = node as estree.ExpressionStatement;
        let expr = exprStatement.expression;
        if (expr.type === 'AwaitExpression') {
          expr = expr.argument;
        }

        if (expr.type === 'MemberExpression') {
          const { property } = expr;
          if (isExpectStaticMethod(expr) && isIdentifier(property)) {
            context.report({
              node: property,
              message: `Complete this assertion; '${property.name}' doesn't assert anything by itself.`,
            });
          } else if (isTestAssertion(expr)) {
            if (
              isIdentifier(property, ...assertionFunctions) &&
              !(isIdentifier(property, 'rejects') && isExpectAssertion(expr.object))
            ) {
              context.report({
                node: property,
                message: `Call this '${property.name}' assertion.`,
              });
            } else if (isIdentifier(property, ...gettersOrModifiers)) {
              context.report({
                node: property,
                message: `Complete this assertion; '${property.name}' doesn't assert anything by itself.`,
              });
            }
          }
        }
        if (isExpectCall(expr) || isExpectStaticMethodCall(expr)) {
          const reportNode = getExpectCallReportNode(expr);
          context.report({
            node: reportNode,
            message: `Complete this assertion; '${reportNode.name}' doesn't assert anything by itself.`,
          });
        }
      },
    };
  },
};

function isTestAssertion(node: estree.MemberExpression): boolean {
  const { object, property } = node;
  // Chai's BDD style where 'should' extends Object.prototype https://www.chaijs.com/guide/styles/
  if (isIdentifier(object) && isIdentifier(property, 'should')) {
    return true;
  }
  if (
    isExpectCall(object) ||
    isExpectStaticMethodCall(object) ||
    isIdentifier(object, 'assert', 'expect', 'should')
  ) {
    return true;
  } else if (object.type === 'MemberExpression') {
    return isTestAssertion(object);
  } else if (object.type === 'CallExpression' && object.callee.type === 'MemberExpression') {
    return isTestAssertion(object.callee);
  }
  return false;
}

function isExpectAssertion(node: estree.Node): boolean {
  if (isExpectCall(node) || isExpectStaticMethodCall(node) || isIdentifier(node, 'expect')) {
    return true;
  }
  if (node.type === 'MemberExpression') {
    return isExpectAssertion(node.object);
  }
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
    return isExpectAssertion(node.callee.object);
  }
  return false;
}

function isExpectCall(
  node: estree.Node,
): node is estree.CallExpression & { callee: estree.Identifier } {
  return (
    node.type === 'CallExpression' &&
    isIdentifier(node.callee, 'expect') &&
    !isNumberLiteral(node.arguments[0])
  );
}

/**
 * Playwright (and Vitest) expose `soft` / `poll` as static methods on `expect`:
 * `expect.soft(locator)`, `expect.poll(fn)`, `expect.soft.poll(fn)`.
 * @see https://playwright.dev/docs/test-assertions
 */
function isExpectStaticMethod(node: estree.Node): node is estree.MemberExpression {
  if (node.type !== 'MemberExpression' || !isIdentifier(node.property, ...expectStaticMethods)) {
    return false;
  }
  if (isIdentifier(node.object, 'expect')) {
    return true;
  }
  // Nested forms such as `expect.soft.poll`
  return isExpectStaticMethod(node.object);
}

function isExpectStaticMethodCall(node: estree.Node): node is estree.CallExpression {
  return node.type === 'CallExpression' && isExpectStaticMethod(node.callee);
}

function getExpectCallReportNode(
  node: estree.CallExpression,
): estree.Identifier {
  if (isIdentifier(node.callee)) {
    return node.callee;
  }
  // Prefer the last static method in the chain (`poll` in `expect.soft.poll(...)`)
  const { property } = node.callee as estree.MemberExpression;
  return property as estree.Identifier;
}
