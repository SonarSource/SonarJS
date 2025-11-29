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

    function isComparableTo(lhs: estree.Node, rhs: estree.Node) {
      const checker = services.program.getTypeChecker();
      const lhsTypeRaw = getTypeFromTreeNode(lhs, services);
      const rhsTypeRaw = getTypeFromTreeNode(rhs, services);

      // Allow comparison when type is unknown or any (JS-619)
      // Prefer avoiding false positives over missing true positives
      const lhsTypeStr = checker.typeToString(lhsTypeRaw);
      const rhsTypeStr = checker.typeToString(rhsTypeRaw);

      // Check if either type is unknown or any
      if (
        lhsTypeStr === 'unknown' ||
        rhsTypeStr === 'unknown' ||
        lhsTypeRaw.flags & ts.TypeFlags.Unknown ||
        rhsTypeRaw.flags & ts.TypeFlags.Unknown ||
        lhsTypeRaw.flags & ts.TypeFlags.Any ||
        rhsTypeRaw.flags & ts.TypeFlags.Any
      ) {
        return true;
      }

      // IndexedAccess types (like T[K]) may resolve to unknown
      // To avoid false positives, we allow comparison for IndexedAccess types
      if (
        lhsTypeRaw.flags & ts.TypeFlags.IndexedAccess ||
        rhsTypeRaw.flags & ts.TypeFlags.IndexedAccess
      ) {
        return true;
      }

      const lhsType = checker.getBaseTypeOfLiteralType(lhsTypeRaw);
      const rhsType = checker.getBaseTypeOfLiteralType(rhsTypeRaw);

      const lhsTypeBaseStr = checker.typeToString(lhsType);
      const rhsTypeBaseStr = checker.typeToString(rhsType);

      // Check after getting base type (handles types that weren't caught above)
      if (
        lhsTypeBaseStr === 'unknown' ||
        rhsTypeBaseStr === 'unknown' ||
        lhsType.flags & ts.TypeFlags.Unknown ||
        rhsType.flags & ts.TypeFlags.Unknown ||
        lhsType.flags & ts.TypeFlags.Any ||
        rhsType.flags & ts.TypeFlags.Any
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
