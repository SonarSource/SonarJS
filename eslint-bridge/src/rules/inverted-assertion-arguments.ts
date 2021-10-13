/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3415

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isFunctionInvocation,
  isIdentifier,
  isLiteral,
  isMethodCall,
  Mocha,
  toEncodedMessage,
} from '../utils';

const ASSERT_FUNCTIONS = [
  'equal',
  'notEqual',
  'strictEqual',
  'notStrictEqual',
  'deepEqual',
  'notDeepEqual',
  'closeTo',
  'approximately',
];

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const testCases: estree.Node[] = [];
    return {
      CallExpression: (node: estree.Node) => {
        if (Mocha.isTestCase(node)) {
          testCases.push(node);
          return;
        }
        if (testCases.length > 0) {
          checkInvertedArguments(node as estree.CallExpression, context);
        }
      },
      'CallExpression:exit': (node: estree.Node) => {
        if (Mocha.isTestCase(node)) {
          testCases.pop();
        }
      },
    };
  },
};

function checkInvertedArguments(node: estree.CallExpression, context: Rule.RuleContext) {
  const args = extractAssertionsArguments(node);
  if (args) {
    const [actual, expected] = args;
    if (isLiteral(actual) && !isLiteral(expected)) {
      const message = toEncodedMessage(
        'Swap these 2 arguments so they are in the correct order: actual value, expected value.',
        [actual],
        ['Other argument to swap.'],
      );
      context.report({
        node: expected,
        message,
      });
    }
  }
}

function extractAssertionsArguments(
  node: estree.CallExpression,
): [estree.Node, estree.Node] | null {
  return extractAssertArguments(node) ?? extractExpectArguments(node) ?? extractFailArguments(node);
}

function extractAssertArguments(node: estree.CallExpression): [estree.Node, estree.Node] | null {
  if (isMethodCall(node) && node.arguments.length > 1) {
    const {
      callee: { object, property },
      arguments: [actual, expected],
    } = node;
    if (isIdentifier(object, 'assert') && isIdentifier(property, ...ASSERT_FUNCTIONS)) {
      return [actual, expected];
    }
  }
  return null;
}

function extractExpectArguments(node: estree.CallExpression): [estree.Node, estree.Node] | null {
  if (isMethodCall(node) && node.arguments.length > 0) {
    const {
      callee: { object, property },
    } = node;
    if (object.type === 'MemberExpression') {
      const { object: object1, property: property1 } = object;
      if (
        object1.type === 'CallExpression' &&
        isFunctionInvocation(object1, 'expect', 1) &&
        isIdentifier(property1, 'to') &&
        isIdentifier(property, 'equal', 'eql')
      ) {
        return [object1.arguments[0], node.arguments[0]];
      } else if (object1.type === 'MemberExpression') {
        const { object: object2, property: property2 } = object1;
        if (
          object2.type === 'CallExpression' &&
          isFunctionInvocation(object2, 'expect', 1) &&
          isIdentifier(property2, 'to') &&
          ((isIdentifier(property1, 'not') && isIdentifier(property, 'equal', 'eql')) ||
            (isIdentifier(property1, 'be') && isIdentifier(property, 'closeTo')))
        ) {
          return [object2.arguments[0], node.arguments[0]];
        }
      }
    }
  }
  return null;
}

function extractFailArguments(node: estree.CallExpression): [estree.Node, estree.Node] | null {
  if (isMethodCall(node) && node.arguments.length > 1) {
    const {
      callee: { object, property },
      arguments: [actual, expected],
    } = node;
    if (isIdentifier(object, 'assert', 'expect', 'should') && isIdentifier(property, 'fail')) {
      return [actual, expected];
    }
  }
  return null;
}
