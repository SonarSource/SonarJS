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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPO`SE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S3757/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import ts, { TypeFlags } from 'typescript';
import { generateMeta, getTypeFromTreeNode, isRequiredParserServices } from '../helpers';
import rspecMeta from './meta.json';

const BINARY_OPERATORS = ['/', '*', '%', '-', '-=', '*=', '/=', '%='];
const UNARY_OPERATORS = ['++', '--', '+', '-'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    messages: {
      noEvaluatedNaN:
        'Change the expression which uses this operand so that it can\'t evaluate to "NaN" (Not a Number).',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function isObjectType(...types: ts.Type[]): boolean {
      return types.some(
        t => !!(t.getFlags() & TypeFlags.Object) && !isDate(t) && t.symbol?.name !== 'Number',
      );
    }

    function isDate(type: ts.Type) {
      const { typeToString } = services.program.getTypeChecker();
      return typeToString(type) === 'Date';
    }

    return {
      'BinaryExpression, AssignmentExpression': (node: estree.Node) => {
        const expression = node as estree.BinaryExpression | estree.AssignmentExpression;
        if (!BINARY_OPERATORS.includes(expression.operator)) {
          return;
        }
        const leftType = getTypeFromTreeNode(expression.left, services);
        const rightType = getTypeFromTreeNode(expression.right, services);
        if (isObjectType(leftType)) {
          context.report({ node: expression.left, messageId: 'noEvaluatedNaN' });
        }
        if (isObjectType(rightType)) {
          context.report({ node: expression.right, messageId: 'noEvaluatedNaN' });
        }
      },
      'UnaryExpression, UpdateExpression': (node: estree.Node) => {
        const expr = node as estree.UpdateExpression | estree.UnaryExpression;
        if (!UNARY_OPERATORS.includes(expr.operator)) {
          return;
        }
        const argType = getTypeFromTreeNode(expr.argument, services);
        if (isObjectType(argType)) {
          context.report({ node, messageId: 'noEvaluatedNaN' });
        }
      },
    };
  },
};
