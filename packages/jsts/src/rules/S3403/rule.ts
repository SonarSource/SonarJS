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
// https://sonarsource.github.io/rspec/#/rspec/S3403/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.ts';
import { meta } from './meta.ts';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, { hasSuggestions: true }, true),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function isComparableTo(lhs: estree.Node, rhs: estree.Node) {
      const checker = services.program.getTypeChecker();
      const lhsType = checker.getBaseTypeOfLiteralType(getTypeFromTreeNode(lhs, services));
      const rhsType = checker.getBaseTypeOfLiteralType(getTypeFromTreeNode(rhs, services));
      // @ts-ignore private API
      return (
        checker.isTypeAssignableTo(lhsType, rhsType) || checker.isTypeAssignableTo(rhsType, lhsType)
      );
    }

    return {
      BinaryExpression: (node: estree.Node) => {
        const { left, operator, right } = node as estree.BinaryExpression;
        if (['===', '!=='].includes(operator) && !isComparableTo(left, right)) {
          const [actual, expected, outcome] =
            operator === '===' ? ['===', '==', 'false'] : ['!==', '!=', 'true'];
          const operatorToken = context.sourceCode
            .getTokensBetween(left, right)
            .find(token => token.type === 'Punctuator' && token.value === operator)!;
          report(
            context,
            {
              message: `Remove this "${actual}" check; it will always be ${outcome}. Did you mean to use "${expected}"?`,
              loc: operatorToken.loc,
              suggest: [
                {
                  desc: `Replace "${actual}" with "${expected}"`,
                  fix: fixer => fixer.replaceText(operatorToken, expected),
                },
              ],
            },
            [left, right].map(node => toSecondaryLocation(node)),
          );
        }
      },
    };
  },
};
