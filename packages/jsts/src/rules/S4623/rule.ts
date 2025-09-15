/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4623/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  isRequiredParserServices,
  isUndefined,
  last,
  RequiredParserServices,
} from '../helpers/index.js';
import type estree from 'estree';
import ts from 'typescript';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      removeUndefined: 'Remove this redundant "undefined".',
      suggestRemoveUndefined: 'Remove this redundant argument',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        CallExpression: (node: estree.Node) => {
          const call = node as estree.CallExpression;
          const { arguments: args } = call;
          if (args.length === 0) {
            return;
          }

          const lastArgument = last(args);
          if (isUndefined(lastArgument) && isOptionalParameter(args.length - 1, call, services)) {
            context.report({
              messageId: 'removeUndefined',
              node: lastArgument,
              suggest: [
                {
                  messageId: 'suggestRemoveUndefined',
                  fix: fixer => {
                    if (call.arguments.length === 1) {
                      const openingParen = context.sourceCode.getTokenAfter(call.callee)!;
                      const closingParen = context.sourceCode.getLastToken(node)!;
                      const [, begin] = openingParen.range;
                      const [end] = closingParen.range;
                      return fixer.removeRange([begin, end]);
                    } else {
                      const [, begin] = args.at(-2)!.range!;
                      const [, end] = lastArgument.range!;
                      return fixer.removeRange([begin, end]);
                    }
                  },
                },
              ],
            });
          }
        },
      };
    }
    return {};
  },
};

function isOptionalParameter(
  paramIndex: number,
  node: estree.CallExpression,
  services: RequiredParserServices,
) {
  const signature = services.program
    .getTypeChecker()
    .getResolvedSignature(
      services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as ts.CallLikeExpression,
    );
  if (signature) {
    const declaration = signature.declaration;
    if (declaration && isFunctionLikeDeclaration(declaration)) {
      const { parameters } = declaration;
      const parameter = parameters[paramIndex];
      return parameter && (parameter.initializer || parameter.questionToken);
    }
  }
  return false;
}

function isFunctionLikeDeclaration(
  declaration: ts.Declaration,
): declaration is ts.FunctionLikeDeclarationBase {
  return [
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.FunctionExpression,
    ts.SyntaxKind.ArrowFunction,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.Constructor,
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.SetAccessor,
  ].includes(declaration.kind);
}
