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

const assertionFunctions = [
  // Chai assertions
  'a',
  'an',
  'include',
  'includes',
  'contain',
  'contains',
  'equal',
  'equals',
  'eq',
  'eql',
  'eqls',
  'above',
  'gt',
  'greaterThan',
  'least',
  'gte',
  'below',
  'lt',
  'lessThan',
  'most',
  'lte',
  'within',
  'instanceof',
  'instanceOf',
  'property',
  'ownPropertyDescriptor',
  'haveOwnPropertyDescriptor',
  'lengthOf',
  'length',
  'match',
  'matches',
  'string',
  'key',
  'keys',
  'throw',
  'throws',
  'Throw',
  'respondTo',
  'respondsTo',
  'satisfy',
  'satisfies',
  'closeTo',
  'approximately',
  'members',
  'oneOf',
  'change',
  'changes',
  'increase',
  'increases',
  'decrease',
  'decreases',
  'by',
  'fail',

  // Jest / Vitest / Bun Matchers & Aliases
  'toBe',
  'toEqual',
  'toStrictEqual',
  'toBeTruthy',
  'toBeFalsy',
  'toBeNull',
  'toBeUndefined',
  'toBeDefined',
  'toBeNaN',
  'toBeInstanceOf',
  'toBeGreaterThan',
  'toBeGreaterThanOrEqual',
  'toBeLessThan',
  'toBeLessThanOrEqual',
  'toBeCloseTo',
  'toContain',
  'toContainEqual',
  'toHaveLength',
  'toHaveProperty',
  'toMatch',
  'toMatchObject',
  'toHaveBeenCalled',
  'toBeCalled',
  'toHaveBeenCalledTimes',
  'toBeCalledTimes',
  'toHaveBeenCalledWith',
  'toBeCalledWith',
  'toHaveBeenLastCalledWith',
  'lastCalledWith',
  'toHaveBeenNthCalledWith',
  'nthCalledWith',
  'toHaveReturned',
  'toReturn',
  'toHaveReturnedTimes',
  'toReturnTimes',
  'toHaveReturnedWith',
  'toReturnWith',
  'toHaveLastReturnedWith',
  'lastReturnedWith',
  'toHaveNthReturnedWith',
  'nthReturnedWith',
  'toThrow',
  'toThrowError',
  'toMatchSnapshot',
  'toMatchInlineSnapshot',
  'toThrowErrorMatchingSnapshot',
  'toThrowErrorMatchingInlineSnapshot',
  'toResolve',
  'toReject',

  // @testing-library/jest-dom
  'toBeInTheDocument',
  'toBeVisible',
  'toBeHidden',
  'toBeDisabled',
  'toBeEnabled',
  'toBeRequired',
  'toBeInvalid',
  'toBeValid',
  'toBeEmptyDOMElement',
  'toBeChecked',
  'toHaveAttribute',
  'toHaveClass',
  'toHaveStyle',
  'toHaveValue',
  'toHaveDisplayValue',
  'toHaveFocus',
  'toHaveTextContent',
  'toHaveAccessibleName',
  'toHaveAccessibleDescription',
  'toHaveAccessibleErrorMessage',
  'toHaveErrorMessage',
  'toContainElement',
  'toContainHTML',

  // @playwright/test
  'toBeAttached',
  'toBeEditable',
  'toBeInViewport',
  'toBeOK',
  'toContainText',
  'toHaveCSS',
  'toHaveId',
  'toHaveJSProperty',
  'toHaveRole',
  'toHaveText',
  'toHaveTitle',
  'toHaveURL',
  'toHaveValues',

  // Node.js assert methods
  'strictEqual',
  'notStrictEqual',
  'deepStrictEqual',
  'notDeepStrictEqual',
  'doesNotThrow',
  'doesNotReject',
  'doesNotMatch',
  'ifError',
];

const gettersOrModifiers = [
  // Chai getters & modifiers
  'to',
  'be',
  'been',
  'is',
  'that',
  'which',
  'and',
  'has',
  'have',
  'with',
  'at',
  'of',
  'same',
  'but',
  'does',
  'still',
  'deep',
  'nested',
  'own',
  'ordered',
  'any',
  'all',
  'itself',
  'should',

  // Jest / Vitest / Bun / Playwright modifiers
  'not',
  'resolves',
  'rejects',
  'soft',
  'poll',
];

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
          if (isTestAssertion(expr)) {
            if (isIdentifier(property, ...assertionFunctions)) {
              context.report({
                node: property,
                message: `Call this '${property.name}' assertion.`,
              });
            }
            if (isIdentifier(property, ...gettersOrModifiers)) {
              context.report({
                node: property,
                message: `Complete this assertion; '${property.name}' doesn't assert anything by itself.`,
              });
            }
          }
        }
        if (isExpectCall(expr)) {
          const { callee } = expr;
          context.report({
            node: callee,
            message: `Complete this assertion; '${callee.name}' doesn't assert anything by itself.`,
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
  if (isExpectCall(object) || isIdentifier(object, 'assert', 'expect', 'should')) {
    return true;
  } else if (object.type === 'MemberExpression') {
    return isTestAssertion(object);
  } else if (object.type === 'CallExpression' && object.callee.type === 'MemberExpression') {
    return isTestAssertion(object.callee);
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
