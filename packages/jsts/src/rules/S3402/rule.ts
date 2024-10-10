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
// https://sonarsource.github.io/rspec/#/rspec/S3402/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import tsTypes from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isRequiredParserServices,
  isStringLiteral,
  report,
  RequiredParserServices,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

const message = `Review this expression to be sure that the concatenation was intended.`;
const objectLikeTypes = new Set(['object', 'Object']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    const services: RequiredParserServices = context.sourceCode.parserServices;

    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    function isStringPlusNonString(type1: tsTypes.Type, type2: tsTypes.Type) {
      if (isLiteralType(type1) || isLiteralType(type2)) {
        return false;
      }
      const isObjectLike = objectLikeTypes.has(checker.typeToString(type2));
      // @ts-ignore private API, see https://github.com/microsoft/TypeScript/issues/9879
      return isStringType(type1) && !isObjectLike && !checker.isTypeAssignableTo(type1, type2);
    }

    function getOperatorLocation(left: estree.Node, right: estree.Node) {
      return context.sourceCode
        .getTokensBetween(left, right)
        .find(token => token.value === '+' || token.value === '+=')!.loc;
    }

    function checkConcatenation(left: estree.Node, right: estree.Node) {
      if (
        isStringLiteral(left) ||
        isStringLiteral(right) ||
        isConcatenation(left) ||
        isConcatenation(right)
      ) {
        return;
      }

      const leftType = getTypeFromTreeNode(left, services);
      const rightType = getTypeFromTreeNode(right, services);
      if (
        isStringPlusNonString(leftType, rightType) ||
        isStringPlusNonString(rightType, leftType)
      ) {
        report(
          context,
          {
            message,
            loc: getOperatorLocation(left, right),
          },
          [
            toSecondaryLocation(left, `left operand has type ${checker.typeToString(leftType)}.`),
            toSecondaryLocation(
              right,
              `right operand has type ${checker.typeToString(rightType)}.`,
            ),
          ],
        );
      }
    }

    return {
      'AssignmentExpression[operator="+="]'(node: estree.AssignmentExpression) {
        checkConcatenation(node.left, node.right);
      },
      'BinaryExpression[operator="+"]'(node: estree.BinaryExpression) {
        checkConcatenation(node.left, node.right);
      },
    };
  },
};

function isStringType(typ: tsTypes.Type) {
  return (typ.getFlags() & tsTypes.TypeFlags.StringLike) !== 0;
}

function isLiteralType(type: tsTypes.Type): boolean {
  if (type.isUnion()) {
    return type.types.some(t => isLiteralType(t));
  }
  return type.isStringLiteral();
}

function isConcatenation(node: estree.Node) {
  return node.type === 'BinaryExpression' && node.operator === '+';
}
