/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3403

import { Rule } from 'eslint';
import * as estree from 'estree';
import * as ts from 'typescript';
import { isRequiredParserServices } from '../utils/isRequiredParserServices';
import { getTypeFromTreeNode, toEncodedMessage } from './utils';

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

    function isSameSymbol(s: ts.Type, t: ts.Type) {
      return s.symbol && t.symbol && s.symbol.name === t.symbol.name;
    }

    function isSubType(s: ts.Type, t: ts.Type): boolean {
      return (
        (s.flags & t.flags) !== 0 ||
        (t.isUnionOrIntersection() && t.types.some(tp => isSubType(s, tp)))
      );
    }

    function isAny(type: ts.Type) {
      return type.flags === ts.TypeFlags.Any;
    }

    function isUndefinedOrNull(type: ts.Type) {
      return type.flags === ts.TypeFlags.Null || type.flags === ts.TypeFlags.Undefined;
    }

    function haveDissimilarTypes(lhs: estree.Node, rhs: estree.Node) {
      const { getBaseTypeOfLiteralType } = services.program.getTypeChecker();
      const lhsType = getBaseTypeOfLiteralType(getTypeFromTreeNode(lhs, services));
      const rhsType = getBaseTypeOfLiteralType(getTypeFromTreeNode(rhs, services));
      return (
        !isSameSymbol(lhsType, rhsType) &&
        !isSubType(lhsType, rhsType) &&
        !isSubType(rhsType, lhsType) &&
        !isAny(lhsType) &&
        !isAny(rhsType) &&
        !isUndefinedOrNull(lhsType) &&
        !isUndefinedOrNull(rhsType)
      );
    }

    return {
      BinaryExpression: (node: estree.Node) => {
        const { left, operator, right } = node as estree.BinaryExpression;
        if (['===', '!=='].includes(operator) && haveDissimilarTypes(left, right)) {
          const [actual, expected, outcome] =
            operator === '===' ? ['===', '==', 'false'] : ['!==', '!=', 'true'];
          context.report({
            message: toEncodedMessage(
              `Remove this "${actual}" check; it will always be ${outcome}. Did you mean to use "${expected}"?`,
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
