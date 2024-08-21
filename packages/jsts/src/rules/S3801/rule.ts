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
// https://sonarsource.github.io/rspec/#/rspec/S3801/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  report,
  RuleContext,
  toSecondaryLocation,
} from '../helpers';
import { meta } from './meta';

interface FunctionContext {
  codePath: Rule.CodePath;
  containsReturnWithValue: boolean;
  containsReturnWithoutValue: boolean;
  containsImplicitReturn: boolean;
  returnStatements: estree.ReturnStatement[];
}

interface FunctionLikeDeclaration {
  type: string;
  id?: estree.Node | null;
  returnType?: TSESTree.TSTypeAnnotation;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),

  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const functionContextStack: FunctionContext[] = [];
    const checkOnFunctionExit = (node: estree.Node) =>
      checkFunctionLikeDeclaration(
        node as FunctionLikeDeclaration,
        functionContextStack[functionContextStack.length - 1],
      );

    function checkFunctionLikeDeclaration(
      node: FunctionLikeDeclaration,
      functionContext?: FunctionContext,
    ) {
      if (
        !functionContext ||
        (!!node.returnType &&
          declaredReturnTypeContainsVoidOrNeverTypes(node.returnType.typeAnnotation))
      ) {
        return;
      }

      checkFunctionForImplicitReturn(functionContext);

      if (hasInconsistentReturns(functionContext)) {
        const secondaryLocations = getSecondaryLocations(functionContext, node as estree.Node);

        report(
          context,
          {
            message: `Refactor this function to use "return" consistently.`,
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionLike,
              getParent(context, node as estree.Node) as TSESTree.Node,
              context as unknown as RuleContext,
            ),
          },
          secondaryLocations,
        );
      }
    }

    function checkFunctionForImplicitReturn(functionContext: FunctionContext) {
      // As this method is called at the exit point of a function definition, the current
      // segments are the ones leading to the exit point at the end of the function. If they
      // are reachable, it means there is an implicit return.
      functionContext.containsImplicitReturn = functionContext.codePath.currentSegments.some(
        segment => segment.reachable,
      );
    }

    function getSecondaryLocations(functionContext: FunctionContext, node: estree.Node) {
      const secondaryLocations = functionContext.returnStatements
        .slice()
        .map(returnStatement =>
          toSecondaryLocation(
            returnStatement,
            returnStatement.argument ? 'Return with value' : 'Return without value',
          ),
        );

      if (functionContext.containsImplicitReturn) {
        const closeCurlyBraceToken = sourceCode.getLastToken(node, token => token.value === '}');
        if (!!closeCurlyBraceToken) {
          secondaryLocations.push(
            toSecondaryLocation(closeCurlyBraceToken, 'Implicit return without value'),
          );
        }
      }

      return secondaryLocations;
    }

    return {
      onCodePathStart(codePath: Rule.CodePath) {
        functionContextStack.push({
          codePath,
          containsReturnWithValue: false,
          containsReturnWithoutValue: false,
          containsImplicitReturn: false,
          returnStatements: [],
        });
      },
      onCodePathEnd() {
        functionContextStack.pop();
      },

      ReturnStatement(node: estree.Node) {
        const currentContext = functionContextStack[functionContextStack.length - 1];
        if (!!currentContext) {
          const returnStatement = node as estree.ReturnStatement;
          currentContext.containsReturnWithValue =
            currentContext.containsReturnWithValue || !!returnStatement.argument;
          currentContext.containsReturnWithoutValue =
            currentContext.containsReturnWithoutValue || !returnStatement.argument;
          currentContext.returnStatements.push(returnStatement);
        }
      },
      'FunctionDeclaration:exit': checkOnFunctionExit,
      'FunctionExpression:exit': checkOnFunctionExit,
      'ArrowFunctionExpression:exit': checkOnFunctionExit,
    };
  },
};

function hasInconsistentReturns(functionContext: FunctionContext) {
  return (
    functionContext.containsReturnWithValue &&
    (functionContext.containsReturnWithoutValue || functionContext.containsImplicitReturn)
  );
}

function declaredReturnTypeContainsVoidOrNeverTypes(returnTypeNode: TSESTree.TypeNode): boolean {
  return (
    isVoidType(returnTypeNode) ||
    (returnTypeNode.type === 'TSUnionType' &&
      returnTypeNode.types.some(declaredReturnTypeContainsVoidOrNeverTypes))
  );
}

function isVoidType(typeNode: TSESTree.TypeNode) {
  return (
    typeNode.type === 'TSUndefinedKeyword' ||
    typeNode.type === 'TSVoidKeyword' ||
    typeNode.type === 'TSNeverKeyword'
  );
}
