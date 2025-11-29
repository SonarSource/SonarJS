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
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isGenericType,
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
      const lhsTypeOriginal = getTypeFromTreeNode(lhs, services);
      const rhsTypeOriginal = getTypeFromTreeNode(rhs, services);
      const lhsType = checker.getBaseTypeOfLiteralType(lhsTypeOriginal);
      const rhsType = checker.getBaseTypeOfLiteralType(rhsTypeOriginal);

      // When type information is uncertain, prefer not raising an issue (JS-619)
      // This follows the principle: avoid false positives over missing true positives
      if (
        (lhsType.flags & ts.TypeFlags.Unknown) !== 0 ||
        (rhsType.flags & ts.TypeFlags.Unknown) !== 0 ||
        (lhsTypeOriginal.flags & ts.TypeFlags.Unknown) !== 0 ||
        (rhsTypeOriginal.flags & ts.TypeFlags.Unknown) !== 0 ||
        (lhsType.flags & ts.TypeFlags.Any) !== 0 ||
        (rhsType.flags & ts.TypeFlags.Any) !== 0 ||
        // IndexedAccess types (e.g., T[Key]) have uncertain runtime values
        (lhsTypeOriginal.flags & ts.TypeFlags.IndexedAccess) !== 0 ||
        (rhsTypeOriginal.flags & ts.TypeFlags.IndexedAccess) !== 0 ||
        isGenericType(lhs as TSESTree.Node, services) ||
        isGenericType(rhs as TSESTree.Node, services)
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
