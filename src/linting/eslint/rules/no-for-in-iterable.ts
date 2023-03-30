/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4139/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import ts from 'typescript';
import { getTypeFromTreeNode, isRequiredParserServices } from './helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      useForOf: 'Use "for...of" to iterate over this "{{iterable}}".',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    const checker = services.program.getTypeChecker();
    return {
      ForInStatement: (node: estree.Node) => {
        const type = getTypeFromTreeNode((node as estree.ForInStatement).right, services);
        if (isIterable(type)) {
          const iterable = type.symbol ? type.symbol.name : 'String';
          context.report({
            messageId: 'useForOf',
            data: { iterable },
            loc: context.getSourceCode().getFirstToken(node)!.loc,
          });
        }
      },
    };

    function isIterable(type: ts.Type) {
      return isCollection(type) || isString(type) || isArrayLikeType(type);
    }

    function isArrayLikeType(type: ts.Type) {
      const constrained = checker.getBaseConstraintOfType(type);
      return isArrayOrUnionOfArrayType(constrained ?? type);
    }

    function isArrayOrUnionOfArrayType(type: ts.Type): boolean {
      for (const part of getUnionTypes(type)) {
        if (!isArrayType(part)) {
          return false;
        }
      }

      return true;
    }

    // Internal TS API
    function isArrayType(type: ts.Type): type is ts.TypeReference {
      return (
        'isArrayType' in checker &&
        typeof checker.isArrayType === 'function' &&
        checker.isArrayType(type)
      );
    }
  },
};

function isCollection(type: ts.Type) {
  return (
    type.symbol !== undefined &&
    [
      'Array',
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
      'Set',
      'Map',
    ].includes(type.symbol.name)
  );
}

function isString(type: ts.Type) {
  return (
    (type.symbol !== undefined && type.symbol.name === 'String') ||
    (type.flags & ts.TypeFlags.StringLike) !== 0
  );
}

function getUnionTypes(type: ts.Type): ts.Type[] {
  return isUnionType(type) ? type.types : [type];
}

function isUnionType(type: ts.Type): type is ts.UnionType {
  return (type.flags & ts.TypeFlags.Union) !== 0;
}
