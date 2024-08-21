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
// https://sonarsource.github.io/rspec/#/rspec/S2970/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, isIdentifier, isNumberLiteral } from '../helpers';
import { meta } from './meta';

const assertionFunctions = [
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
];

const gettersOrModifiers = [
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

  // Modifier functions
  'not',
  'deep',
  'nested',
  'own',
  'ordered',
  'any',
  'all',
  'itself',

  'should',
];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData),
  create(context: Rule.RuleContext) {
    return {
      ExpressionStatement(node: estree.Node) {
        const exprStatement = node as estree.ExpressionStatement;
        if (exprStatement.expression.type === 'MemberExpression') {
          const { property } = exprStatement.expression;
          if (isTestAssertion(exprStatement.expression)) {
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
        if (isExpectCall(exprStatement.expression)) {
          const { callee } = exprStatement.expression;
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
