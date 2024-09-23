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
// https://sonarsource.github.io/rspec/#/rspec/S3981

import type { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { generateMeta, isRequiredParserServices } from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';

const CollectionLike = ['Array', 'Map', 'Set', 'WeakMap', 'WeakSet'];
const CollectionSizeLike = ['length', 'size'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      fixCollectionSizeCheck:
        'Fix this expression; {{propertyName}} of "{{objectName}}" is always greater or equal to zero.',
      suggestFixedSizeCheck: 'Use "{{operator}}" for {{operation}} check',
    },
    hasSuggestions: true,
  }),
  create(context) {
    const services = context.sourceCode.parserServices;
    const isTypeCheckerAvailable = isRequiredParserServices(services);
    return {
      BinaryExpression: (node: estree.BinaryExpression) => {
        if (['<', '>='].includes(node.operator)) {
          const lhs = node.left;
          const rhs = node.right;
          if (isZeroLiteral(rhs) && lhs.type === 'MemberExpression') {
            const { object, property } = lhs;
            if (
              property.type === 'Identifier' &&
              CollectionSizeLike.includes(property.name) &&
              (!isTypeCheckerAvailable || isCollection(object, services))
            ) {
              context.report({
                messageId: 'fixCollectionSizeCheck',
                data: {
                  propertyName: property.name,
                  objectName: context.sourceCode.getText(object),
                },
                node,
                suggest: getSuggestion(node, property.name, context),
              });
            }
          }
        }
      },
    };
  },
};

function isZeroLiteral(node: estree.Node) {
  return node.type === 'Literal' && node.value === 0;
}

function isCollection(node: estree.Node, services: ParserServicesWithTypeInformation) {
  const checker = services.program.getTypeChecker();
  const tp = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node));
  return !!tp.symbol && CollectionLike.includes(tp.symbol.name);
}

function getSuggestion(
  expr: estree.BinaryExpression,
  operation: string,
  context: Rule.RuleContext,
): Rule.SuggestionReportDescriptor[] {
  const { left, operator } = expr;
  const operatorToken = context.sourceCode.getTokenAfter(left, token => token.value === operator)!;
  const fixedOperator = operator === '<' ? '==' : '>';
  return [
    {
      messageId: 'suggestFixedSizeCheck',
      data: {
        operation,
        operator: fixedOperator,
      },
      fix: fixer => fixer.replaceText(operatorToken, fixedOperator),
    },
  ];
}
