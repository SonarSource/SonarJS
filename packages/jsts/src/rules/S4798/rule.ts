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
// https://sonarsource.github.io/rspec/#/rspec/S4798/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      provideDefault:
        "Provide a default value for '{{parameter}}' so that " +
        'the logic of the function is more evident when this parameter is missing. ' +
        'Consider defining another function if providing default value is not possible.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression': (node: estree.Node) => {
        const functionLike = node as FunctionLike;
        for (const param of functionLike.params) {
          if (param.type === 'Identifier' && isOptionalBoolean(param)) {
            context.report({
              messageId: 'provideDefault',
              data: {
                parameter: param.name,
              },
              node: param as estree.Node,
            });
          }
        }
      },
    };
  },
};

function isOptionalBoolean(node: TSESTree.Identifier): boolean {
  return usesQuestionOptionalSyntax(node) || usesUnionUndefinedOptionalSyntax(node);
}

/**
 * Matches "param?: boolean"
 */
function usesQuestionOptionalSyntax(node: TSESTree.Identifier): boolean {
  return (
    !!node.optional &&
    !!node.typeAnnotation &&
    node.typeAnnotation.typeAnnotation.type === 'TSBooleanKeyword'
  );
}

/**
 * Matches "boolean | undefined"
 */
function usesUnionUndefinedOptionalSyntax(node: TSESTree.Identifier): boolean {
  if (!!node.typeAnnotation && node.typeAnnotation.typeAnnotation.type === 'TSUnionType') {
    const types = node.typeAnnotation.typeAnnotation.types;
    return (
      types.length === 2 &&
      types.some(tp => tp.type === 'TSBooleanKeyword') &&
      types.some(tp => tp.type === 'TSUndefinedKeyword')
    );
  }
  return false;
}
