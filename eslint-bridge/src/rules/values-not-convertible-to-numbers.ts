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
// https://jira.sonarsource.com/browse/RSPEC-3758

import { Rule } from 'eslint';
import * as estree from 'estree';
import { isRequiredParserServices, RequiredParserServices } from '../utils/parser-services';
import * as ts from 'typescript';
import { getTypeFromTreeNode, isStringType } from '../utils/type-checking';

const message = (typeName: string) =>
  `Re-evaluate the data flow; this operand of a numeric comparison could be of type ${typeName}.`;
const comparisonOperators = new Set(['>', '<', '>=', '<=']);

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services: RequiredParserServices = context.parserServices;

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
            message: message(checker.typeToString(leftType)),
            node: left,
          });
        }
        if (!isRightConvertibleToNumber) {
          context.report({
            message: message(checker.typeToString(rightType)),
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
    valueOfSignatures.some(signature => isNumberLike(signature.getReturnType()))
  );
}

function getValueOfSignatures(typ: ts.Type, checker: ts.TypeChecker) {
  const valueOfSymbol = typ.getProperty('valueOf');
  if (!valueOfSymbol) {
    return [];
  }
  const declarations = valueOfSymbol.getDeclarations() || [];
  return declarations
    .map(declaration => checker.getTypeAtLocation(declaration).getCallSignatures())
    .reduce((result, decl) => result.concat(decl), []);
}

function isNumberLike(typ: ts.Type) {
  return (typ.getFlags() & ts.TypeFlags.NumberLike) !== 0;
}
