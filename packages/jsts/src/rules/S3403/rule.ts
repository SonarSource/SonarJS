/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import estree from 'estree';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { hasSuggestions: true }),
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
