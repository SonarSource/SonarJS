/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S4043/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import {
  type RequiredParserServices,
  isRequiredParserServices,
} from '../helpers/parser-services.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getSymbolAtLocation, getTypeFromTreeNode, isArrayLikeType } from '../helpers/type.js';
import { localAncestorsChain } from '../helpers/ancestor.js';
import { getStaticExpressionValue, unwrapTypeScriptExpression } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

const arrayMutatingMethods = new Set(['reverse', 'sort']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      moveMethod:
        'Move this array "{{method}}" operation to a separate statement or replace it with "{{suggestedMethod}}".',
      suggestMethod: 'Replace with "{{suggestedMethod}}" method',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression(node: estree.CallExpression) {
        const { callee } = node;
        if (callee.type === 'MemberExpression') {
          const method = getArrayMutatingMethod(callee);
          if (method && isArrayMutatingCall(callee, services)) {
            const mutatedArray = callee.object;

            if (
              isIdentifierOrPropertyAccessExpression(mutatedArray, services) &&
              !isInSelfAssignment(mutatedArray, node) &&
              !isForOfIterable(context, node) &&
              isForbiddenOperation(node)
            ) {
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
                      const propertyText = context.sourceCode.getText(callee.property);
                      const fixedPropertyText = callee.computed
                        ? `${propertyText[0]}${suggestedMethod}${propertyText[0]}`
                        : suggestedMethod;
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

function getArrayMutatingMethod(memberExpression: estree.MemberExpression): string | undefined {
  const { computed, property } = memberExpression;
  let name: string | undefined;
  if (computed) {
    name = getStaticExpressionValue(property as estree.Expression);
  } else if (property.type === 'Identifier') {
    name = property.name;
  }
  return name && arrayMutatingMethods.has(name) ? name : undefined;
}

function isArrayMutatingCall(
  memberExpression: estree.MemberExpression,
  services: RequiredParserServices,
) {
  const type = getTypeFromTreeNode(memberExpression.object, services);
  const options = services.program.getCompilerOptions();
  const receiverType =
    memberExpression.optional && (options.strictNullChecks ?? options.strict)
      ? services.program.getTypeChecker().getNonNullableType(type)
      : type;
  return isArrayLikeType(receiverType, services);
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
    parent?.type === 'AssignmentExpression' &&
    parent.operator === '=' &&
    parent.left.type === 'Identifier' &&
    mutatedArray.type === 'Identifier' &&
    parent.left.name === mutatedArray.name
  );
}

function isForOfIterable(context: Rule.RuleContext, node: estree.Node): boolean {
  return context.sourceCode
    .getAncestors(node)
    .some(
      ancestor =>
        ancestor.type === 'ForOfStatement' && unwrapTypeScriptExpression(ancestor.right) === node,
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
