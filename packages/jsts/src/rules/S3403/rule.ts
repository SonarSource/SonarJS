/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S3403/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import * as ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function hasUnknownOrIndexedAccessType(type: ts.Type, checker: ts.TypeChecker): boolean {
      // Check if this type is 'unknown' (JS-619)
      if (type.flags & ts.TypeFlags.Unknown) {
        return true;
      }

      // Check for IndexedAccess type flag (JS-619)
      // T[K] where T extends Record<string, unknown> should be allowed to compare with any type
      // since the actual value type is unknown at compile time
      if (type.flags & ts.TypeFlags.IndexedAccess) {
        return true;
      }

      // Check union types - any constituent type with unknown or indexed access should allow comparison
      if (type.isUnion()) {
        return type.types.some(t => hasUnknownOrIndexedAccessType(t, checker));
      }

      // Check intersection types
      if (type.isIntersection()) {
        return type.types.some(t => hasUnknownOrIndexedAccessType(t, checker));
      }

      return false;
    }

    function isComparableTo(lhs: estree.Node, rhs: estree.Node) {
      const checker = services.program.getTypeChecker();
      const lhsOriginalType = getTypeFromTreeNode(lhs, services);
      const rhsOriginalType = getTypeFromTreeNode(rhs, services);
      const lhsType = checker.getBaseTypeOfLiteralType(lhsOriginalType);
      const rhsType = checker.getBaseTypeOfLiteralType(rhsOriginalType);

      // Allow comparison when type information is unknown (JS-619)
      // Comparing 'unknown' type with any other type is valid in TypeScript
      // Check if either type is or contains 'unknown' or is an indexed access type
      if (
        hasUnknownOrIndexedAccessType(lhsOriginalType, checker) ||
        hasUnknownOrIndexedAccessType(rhsOriginalType, checker)
      ) {
        return true;
      }

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
