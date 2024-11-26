/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S4798/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      provideDefault:
        "Provide a default value for '{{parameter}}' so that " +
        'the logic of the function is more evident when this parameter is missing. ' +
        'Consider defining another function if providing default value is not possible.',
    },
  }),
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
