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
// https://sonarsource.github.io/rspec/#/rspec/S5958/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { generateMeta, getVariableFromIdentifier, isIdentifier, Mocha } from '../helpers';
import { meta } from './meta';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData),
  create(context: Rule.RuleContext) {
    let catchWithDone = false;

    function isInsideTest(node: estree.Node) {
      return context.sourceCode
        .getAncestors(node)
        .some(n => n.type === 'CallExpression' && Mocha.isTestConstruct(n));
    }

    return {
      'CatchClause CallExpression[callee.name="done"]': (_node: estree.Node) => {
        catchWithDone = true;
      },
      'CatchClause:exit': (node: estree.Node) => {
        if (!catchWithDone || !isInsideTest(node)) {
          return;
        }
        catchWithDone = false;
        const { param } = node as estree.CatchClause;
        if (param && param.type === 'Identifier') {
          const exception = getVariableFromIdentifier(param, context.sourceCode.getScope(node));
          if (exception && exception.references.length === 0) {
            context.report({
              node: param,
              message:
                'Either the exception should be passed to "done(e)", or the exception should be tested further.',
            });
          }
        }
      },
      CallExpression(node: estree.Node) {
        const callExpr = node as estree.CallExpression;
        if (
          isInsideTest(node) &&
          isThrowAssertWithoutNot(callExpr) &&
          (callExpr.arguments.length === 0 ||
            (callExpr.arguments.length === 1 && isIdentifier(callExpr.arguments[0], 'Error')))
        ) {
          context.report({
            node: callExpr.callee.property,
            message: 'Assert more concrete exception type or assert the message of exception.',
          });
        }
      },
    };
  },
};

// find nodes in shape expect(...).a.b.c.throw() or a.should.throw()
function isThrowAssertWithoutNot(
  node: estree.CallExpression,
): node is estree.CallExpression & { callee: estree.MemberExpression } {
  if (node.callee.type !== 'MemberExpression') {
    return false;
  }
  let { object, property } = node.callee;
  if (!isIdentifier(property, 'throw')) {
    return false;
  }
  while (object.type === 'MemberExpression') {
    if (isIdentifier(object.property, 'not')) {
      return false;
    }
    if (isIdentifier(object.property, 'should')) {
      return true;
    }
    object = object.object;
  }
  return object.type === 'CallExpression' && isIdentifier(object.callee, 'expect');
}
