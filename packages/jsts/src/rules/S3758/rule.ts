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
// https://sonarsource.github.io/rspec/#/rspec/S3758/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isBigIntType,
  isNumberType,
  isRequiredParserServices,
  isStringType,
  RequiredParserServices,
} from '../helpers/index.js';
import { meta } from './meta.js';

const comparisonOperators = new Set(['>', '<', '>=', '<=']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      reEvaluateDataFlow:
        'Re-evaluate the data flow; this operand of a numeric comparison could be of type {{type}}.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services: RequiredParserServices = context.sourceCode.parserServices;

    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      BinaryExpression(node: estree.Node) {
        const { left, operator, right } = node as estree.BinaryExpression;
        if (!comparisonOperators.has(operator)) {
          return;
        }
        if (left.type === 'MemberExpression' || right.type === 'MemberExpression') {
          // avoid FPs on field access
          return;
        }
        const checker = services.program.getTypeChecker();
        const leftType = getTypeFromTreeNode(left, services);
        const rightType = getTypeFromTreeNode(right, services);
        if (isStringType(leftType) || isStringType(rightType)) {
          return;
        }

        const isLeftConvertibleToNumber = isConvertibleToNumber(leftType, checker);
        const isRightConvertibleToNumber = isConvertibleToNumber(rightType, checker);
        if (!isLeftConvertibleToNumber) {
          context.report({
            messageId: 'reEvaluateDataFlow',
            data: {
              type: checker.typeToString(leftType),
            },
            node: left,
          });
        }
        if (!isRightConvertibleToNumber) {
          context.report({
            messageId: 'reEvaluateDataFlow',
            data: {
              type: checker.typeToString(rightType),
            },
            node: right,
          });
        }
      },
    };
  },
};

function isConvertibleToNumber(typ: ts.Type, checker: ts.TypeChecker) {
  const flags = typ.getFlags();
  if ((flags & ts.TypeFlags.BooleanLike) !== 0) {
    return true;
  }
  if ((flags & ts.TypeFlags.Undefined) !== 0) {
    return false;
  }
  const valueOfSignatures = getValueOfSignatures(typ, checker);
  return (
    valueOfSignatures.length === 0 ||
    valueOfSignatures.some(signature => {
      const returnType = signature.getReturnType();
      return isNumberType(returnType) || isBigIntType(returnType);
    })
  );
}

function getValueOfSignatures(typ: ts.Type, checker: ts.TypeChecker) {
  const valueOfSymbol = typ.getProperty('valueOf');
  if (!valueOfSymbol) {
    return [];
  }
  const declarations = valueOfSymbol.getDeclarations() ?? [];
  return declarations
    .map(declaration => checker.getTypeAtLocation(declaration).getCallSignatures())
    .reduce((result, decl) => result.concat(decl), []);
}
