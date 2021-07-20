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
// https://jira.sonarsource.com/browse/RSPEC-4619

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isArray, isNumber, isRequiredParserServices } from '../utils';
import { isLiteral } from 'eslint-plugin-sonarjs/lib/utils/nodes';
import { TSESTree } from '@typescript-eslint/experimental-utils';

const message = 'Use "indexOf" or "includes" (available from ES2016) instead.';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;

    function prototypeProperty(node: estree.Expression) {
      const expr = node as TSESTree.Expression;
      if (!isLiteral(expr) || typeof expr.value !== 'string') {
        return false;
      }

      return ['indexOf', 'lastIndexOf', 'forEach', 'map', 'filter', 'every', 'some'].includes(
        expr.value,
      );
    }

    if (isRequiredParserServices(services)) {
      return {
        "BinaryExpression[operator='in']": (node: estree.Node) => {
          const binExpr = node as estree.BinaryExpression;
          if (
            isArray(binExpr.right, services) &&
            !prototypeProperty(binExpr.left) &&
            !isNumber(binExpr.left, services)
          ) {
            context.report({
              message,
              node,
            });
          }
        },
      };
    }
    return {};
  },
};
