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
// https://sonarsource.github.io/rspec/#/rspec/S2871/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import * as ts from 'typescript';
import { isRequiredParserServices, sortLike } from './helpers';

const compareFunctionPlaceholder = '(a, b) => (a - b)';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      provideCompareFunction:
        'Provide a compare function to avoid sorting elements alphabetically.',
      suggestCompareFunction: 'Add a comparator function to sort in ascending order',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    return {
      'CallExpression[arguments.length=0][callee.type="MemberExpression"]': (
        call: estree.CallExpression,
      ) => {
        const { object, property } = call.callee as TSESTree.MemberExpression;
        const text = context.getSourceCode().getText(property as estree.Node);
        if (sortLike.includes(text) && isArrayNode(object)) {
          const closingParenthesis = context
            .getSourceCode()
            .getLastToken(call, token => token.value === ')')!;
          context.report({
            messageId: 'provideCompareFunction',
            node: property as estree.Node,
            suggest: [
              {
                messageId: 'suggestCompareFunction',
                fix: fixer =>
                  fixer.insertTextBefore(closingParenthesis, compareFunctionPlaceholder),
              },
            ],
          });
        }
      },
    };

    function isArrayNode(node: TSESTree.Node) {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      const type = checker.getTypeAtLocation(tsNode);
      const constrained = checker.getBaseConstraintOfType(type);

      return isArrayOrUnionOfArrayType(constrained ?? type) && !isArrayOfStringType(type);
    }

    function isArrayOrUnionOfArrayType(type: ts.Type): boolean {
      for (const part of getUnionTypes(type)) {
        if (!isArrayType(part)) {
          return false;
        }
      }

      return true;
    }

    function isArrayOfStringType(type: ts.Type) {
      const typeNode = checker.typeToTypeNode(type, undefined, undefined);
      return (
        typeNode &&
        ts.isArrayTypeNode(typeNode) &&
        typeNode.elementType.kind === ts.SyntaxKind.StringKeyword
      );
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

function getUnionTypes(type: ts.Type): ts.Type[] {
  return isUnionType(type) ? type.types : [type];
}

function isUnionType(type: ts.Type): type is ts.UnionType {
  return (type.flags & ts.TypeFlags.Union) !== 0;
}
