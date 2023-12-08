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
// https://sonarsource.github.io/rspec/#/rspec/S3003/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { isString, isRequiredParserServices, toEncodedMessage } from '../helpers';
import { SONAR_RUNTIME } from '../../linter/parameters';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      BinaryExpression: (node: estree.Node) => {
        const { operator, left, right } = node as estree.BinaryExpression;
        if (
          ['<', '<=', '>', '>='].includes(operator) &&
          isString(left, services) &&
          isString(right, services) &&
          !isLiteralException(left) &&
          !isLiteralException(right) &&
          !isWithinSortCallback(context)
        ) {
          context.report({
            message: toEncodedMessage(
              `Convert operands of this use of "${operator}" to number type.`,
              [left, right],
            ),
            loc: context.sourceCode
              .getTokensBetween(left, right)
              .find(token => token.type === 'Punctuator' && token.value === operator)!.loc,
          });
        }
      },
    };
  },
};

function isLiteralException(node: estree.Node) {
  return node.type === 'Literal' && node.raw!.length === 3;
}

function isWithinSortCallback(context: Rule.RuleContext) {
  const ancestors = context.getAncestors().reverse();
  const maybeCallback = ancestors.find(node =>
    ['ArrowFunctionExpression', 'FunctionExpression'].includes(node.type),
  );
  if (maybeCallback) {
    const callback = maybeCallback as TSESTree.Node;
    const parent = callback.parent;
    if (parent?.type === 'CallExpression') {
      const { callee, arguments: args } = parent;
      let funcName: string | undefined;
      if (callee.type === 'Identifier') {
        funcName = callee.name;
      } else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        funcName = callee.property.name;
      }
      return funcName?.match(/sort/i) && args.some(arg => arg === callback);
    }
  }
  return false;
}
