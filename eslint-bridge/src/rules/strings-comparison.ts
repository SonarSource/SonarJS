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
// https://jira.sonarsource.com/browse/RSPEC-3003

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isRequiredParserServices } from '../utils/isRequiredParserServices';
import { isString, toEncodedMessage } from './utils';

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
          !isLiteralException(right)
        ) {
          context.report({
            message: toEncodedMessage(
              `Convert operands of this use of "${operator}" to number type.`,
              [left, right],
            ),
            loc: context
              .getSourceCode()
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
