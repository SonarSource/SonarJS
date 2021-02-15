/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-3801

import { AST, Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { getParent } from 'eslint-plugin-sonarjs/lib/utils/nodes';
import { getMainFunctionTokenLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';
import { toEncodedMessage } from '../utils/secondary-locations';

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
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    const sourceCode = context.getSourceCode();
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
        (!!node.returnType && declaredReturnTypeContainsVoidTypes(node.returnType.typeAnnotation))
      ) {
        return;
      }

      checkFunctionForImplicitReturn(functionContext);

      if (hasInconsistentReturns(functionContext)) {
        const [secondaryLocationsHolder, secondaryLocationMessages] = getSecondaryLocations(
          functionContext,
          node as estree.Node,
        );
        const message = toEncodedMessage(
          `Refactor this function to use "return" consistently.`,
          secondaryLocationsHolder,
          secondaryLocationMessages,
        );

        context.report({
          message,
          loc: getMainFunctionTokenLocation(node as estree.Function, getParent(context), context),
        });
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

    function getSecondaryLocations(
      functionContext: FunctionContext,
      node: estree.Node,
    ): [Array<AST.Token | TSESTree.Node>, Array<string>] {
      const secondaryLocationsHolder = functionContext.returnStatements.slice() as TSESTree.Node[];
      const secondaryLocationMessages: string[] = functionContext.returnStatements.map(
        returnStatement =>
          returnStatement.argument ? 'Return with value' : 'Return without value',
      );

      if (functionContext.containsImplicitReturn) {
        const closeCurlyBraceToken = sourceCode.getLastToken(node, token => token.value === '}');
        if (!!closeCurlyBraceToken) {
          secondaryLocationsHolder.push(closeCurlyBraceToken as TSESTree.Node);
          secondaryLocationMessages.push('Implicit return without value');
        }
      }

      return [secondaryLocationsHolder, secondaryLocationMessages];
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

function declaredReturnTypeContainsVoidTypes(returnTypeNode: TSESTree.TypeNode): boolean {
  return (
    isVoidType(returnTypeNode) ||
    (returnTypeNode.type === 'TSUnionType' &&
      returnTypeNode.types.some(declaredReturnTypeContainsVoidTypes)) ||
    (returnTypeNode.type === 'TSParenthesizedType' &&
      declaredReturnTypeContainsVoidTypes(returnTypeNode.typeAnnotation))
  );
}

function isVoidType(typeNode: TSESTree.TypeNode) {
  return typeNode.type === 'TSUndefinedKeyword' || typeNode.type === 'TSVoidKeyword';
}
