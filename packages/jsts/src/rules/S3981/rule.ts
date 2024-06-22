/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { ParserServicesWithTypeInformation } from '@typescript-eslint/typescript-estree';
import { isParserServicesWithTypeInformation } from '../utils/parser-services';
import docsUrl from '../utils/docs-url';

const CollectionLike = ['Array', 'Map', 'Set', 'WeakMap', 'WeakSet'];
const CollectionSizeLike = ['length', 'size'];

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      fixCollectionSizeCheck:
        'Fix this expression; {{propertyName}} of "{{objectName}}" is always greater or equal to zero.',
      suggestFixedSizeCheck: 'Use "{{operator}}" for {{operation}} check',
    },
    schema: [],
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description: 'Collection sizes and array length comparisons should make sense',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    const isTypeCheckerAvailable = isParserServicesWithTypeInformation(services);
    return {
      BinaryExpression: (node: TSESTree.Node) => {
        const expr = node as TSESTree.BinaryExpression;
        if (['<', '>='].includes(expr.operator)) {
          const lhs = expr.left;
          const rhs = expr.right;
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
                suggest: getSuggestion(expr, property.name, context),
              });
            }
          }
        }
      },
    };
  },
};

function isZeroLiteral(node: TSESTree.Node) {
  return node.type === 'Literal' && node.value === 0;
}

function isCollection(node: TSESTree.Node, services: ParserServicesWithTypeInformation) {
  const checker = services.program.getTypeChecker();
  const tp = checker.getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
  return !!tp.symbol && CollectionLike.includes(tp.symbol.name);
}

function getSuggestion(
  expr: TSESTree.BinaryExpression,
  operation: string,
  context: TSESLint.RuleContext<string, string[]>,
): TSESLint.ReportSuggestionArray<string> {
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

export = rule;
