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
// https://sonarsource.github.io/rspec/#/rspec/S4043/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import * as ts from 'typescript';
import {
  isArray,
  sortLike,
  isRequiredParserServices,
  RequiredParserServices,
  getSymbolAtLocation,
  localAncestorsChain,
} from '../helpers';

const arrayMutatingMethods = ['reverse', "'reverse'", '"reverse"', ...sortLike];

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      moveMethod:
        'Move this array "{{method}}" operation to a separate statement or replace it with "{{suggestedMethod}}".',
      suggestMethod: 'Replace with "{{suggestedMethod}}" method',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression(node: estree.CallExpression) {
        const { callee } = node;
        if (callee.type === 'MemberExpression') {
          const propertyText = context.sourceCode.getText(callee.property);
          if (isArrayMutatingCall(callee, services, propertyText)) {
            const mutatedArray = callee.object;

            if (
              isIdentifierOrPropertyAccessExpression(mutatedArray, services) &&
              !isInSelfAssignment(mutatedArray, node) &&
              isForbiddenOperation(node)
            ) {
              const method = formatMethod(propertyText);
              const suggestedMethod = method === 'sort' ? 'toSorted' : 'toReversed';
              context.report({
                messageId: 'moveMethod',
                data: {
                  method,
                  suggestedMethod,
                },
                node,
                suggest: [
                  {
                    messageId: 'suggestMethod',
                    data: {
                      suggestedMethod,
                    },
                    fix: fixer => {
                      const fixedPropertyText = propertyText.replace(method, suggestedMethod);
                      return fixer.replaceText(callee.property, fixedPropertyText);
                    },
                  },
                ],
              });
            }
          }
        }
      },
    };
  },
};

function formatMethod(mutatingMethod: string) {
  if (mutatingMethod.startsWith('"') || mutatingMethod.startsWith("'")) {
    return mutatingMethod.substring(1, mutatingMethod.length - 1);
  } else {
    return mutatingMethod;
  }
}

function isArrayMutatingCall(
  memberExpression: estree.MemberExpression,
  services: RequiredParserServices,
  propertyText: string,
) {
  return arrayMutatingMethods.includes(propertyText) && isArray(memberExpression.object, services);
}

function isIdentifierOrPropertyAccessExpression(
  node: estree.Node,
  services: RequiredParserServices,
): boolean {
  return (
    node.type === 'Identifier' ||
    (node.type === 'MemberExpression' && !isGetAccessor(node.property, services))
  );
}

function isGetAccessor(node: estree.Node, services: RequiredParserServices): boolean {
  const symbol = getSymbolAtLocation(node, services);
  const declarations = symbol?.declarations;
  return declarations?.length === 1 && declarations[0].kind === ts.SyntaxKind.GetAccessor;
}

function isInSelfAssignment(mutatedArray: estree.Node, node?: estree.Node): boolean {
  const parent = (node as TSESTree.Node).parent;
  return (
    // check assignment
    parent !== undefined &&
    parent.type === 'AssignmentExpression' &&
    parent.operator === '=' &&
    parent.left.type === 'Identifier' &&
    mutatedArray.type === 'Identifier' &&
    parent.left.name === mutatedArray.name
  );
}

function isForbiddenOperation(node: estree.Node) {
  return !isStandaloneExpression(node) && !isReturnedExpression(node);
}

function isStandaloneExpression(node: estree.Node) {
  const ancestors = localAncestorsChain(node as TSESTree.Node);
  const returnIdx = ancestors.findIndex(ancestor => ancestor.type === 'ExpressionStatement');
  return (
    returnIdx > -1 &&
    ancestors
      .slice(0, returnIdx)
      .every(ancestor => ['ChainExpression', 'LogicalExpression'].includes(ancestor.type))
  );
}

function isReturnedExpression(node: estree.Node) {
  const ancestors = localAncestorsChain(node as TSESTree.Node);
  const returnIdx = ancestors.findIndex(ancestor => ancestor.type === 'ReturnStatement');
  return (
    returnIdx > -1 &&
    ancestors
      .slice(0, returnIdx)
      .every(ancestor =>
        ['ArrayExpression', 'ObjectExpression', 'ConditionalExpression', 'SpreadElement'].includes(
          ancestor.type,
        ),
      )
  );
}
