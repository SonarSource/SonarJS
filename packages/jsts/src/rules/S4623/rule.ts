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
// https://sonarsource.github.io/rspec/#/rspec/S4623/javascript

import { Rule } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { isRequiredParserServices, isUndefined, RequiredParserServices } from '../helpers';
import * as estree from 'estree';
import * as ts from 'typescript';

export const rule: Rule.RuleModule = {
  meta: {
    hasSuggestions: true,
    messages: {
      removeUndefined: 'Remove this redundant "undefined".',
      suggestRemoveUndefined: 'Remove this redundant argument',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        CallExpression: (node: estree.Node) => {
          const call = node as estree.CallExpression;
          const { arguments: args } = call;
          if (args.length === 0) {
            return;
          }

          const lastArgument = args[args.length - 1];
          if (isUndefined(lastArgument) && isOptionalParameter(args.length - 1, call, services)) {
            context.report({
              messageId: 'removeUndefined',
              node: lastArgument,
              suggest: [
                {
                  messageId: 'suggestRemoveUndefined',
                  fix: fixer => {
                    if (call.arguments.length === 1) {
                      const openingParen = context.getSourceCode().getTokenAfter(call.callee)!;
                      const closingParen = context.getSourceCode().getLastToken(node)!;
                      const [, begin] = openingParen.range;
                      const [end] = closingParen.range;
                      return fixer.removeRange([begin, end]);
                    } else {
                      const [, begin] = args[args.length - 2].range!;
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
