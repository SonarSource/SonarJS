/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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

import { AST, Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import { toEncodedMessage } from "./utils";
import { getParent } from "eslint-plugin-sonarjs/lib/utils/nodes";
import { getMainFunctionTokenLocation } from "eslint-plugin-sonarjs/lib/utils/locations";

interface FunctionContext {
  codePath: Rule.CodePath;
  containsReturnWithValue: boolean;
  containsReturnWithoutValue: boolean;
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
        enum: ["sonar-runtime"],
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
      const mainLocation = getMainFunctionTokenLocation(
        node as estree.Function,
        getParent(context),
        context,
      );

      if (
        !functionContext ||
        (!!node.returnType &&
          declaredReturnTypeContainsVoidTypes(node.returnType.typeAnnotation)) ||
        !mainLocation
      ) {
        return;
      }

      // As this method is called at the exit point of a function definition, the current
      // segments are the ones leading to the exit point at the end of the function. If they
      // are reachable, it means there is an implicit return.
      const containsImplicitReturn = functionContext.codePath.currentSegments.some(
        segment => segment.reachable,
      );

      if (hasInconsistentReturns(functionContext, containsImplicitReturn)) {
        const [secondaryLocationsHolder, secondaryLocationMessages] = getSecondaryLocations(
          functionContext,
          containsImplicitReturn,
          node as estree.Node,
        );
        const message = toEncodedMessage(
          `Refactor this function to use "return" consistently.`,
          secondaryLocationsHolder,
          secondaryLocationMessages,
        );

        context.report({
          message,
          loc: mainLocation,
        });
      }
    }

    function getSecondaryLocations(
      functionContext: FunctionContext,
      hasImplicitReturn: boolean,
      node: estree.Node,
    ): [Array<AST.Token | TSESTree.Node>, Array<string>] {
      const secondaryLocationsHolder = functionContext.returnStatements.slice() as TSESTree.Node[];
      const secondaryLocationMessages: string[] = functionContext.returnStatements.map(
        returnStatement =>
          returnStatement.argument ? "Return with value" : "Return without value",
      );

      if (hasImplicitReturn) {
        const closeCurlyBraceToken = sourceCode.getLastToken(node, token => token.value === "}");
        if (!!closeCurlyBraceToken) {
          secondaryLocationsHolder.push(closeCurlyBraceToken as TSESTree.Node);
          secondaryLocationMessages.push("Implicit return without value");
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
      "FunctionDeclaration:exit": checkOnFunctionExit,
      "FunctionExpression:exit": checkOnFunctionExit,
      "ArrowFunctionExpression:exit": checkOnFunctionExit,
    };
  },
};

function hasInconsistentReturns(functionContext: FunctionContext, containsImplicitReturn: boolean) {
  return (
    functionContext.containsReturnWithValue &&
    (functionContext.containsReturnWithoutValue || containsImplicitReturn)
  );
}

function declaredReturnTypeContainsVoidTypes(returnTypeNode: TSESTree.TypeNode): boolean {
  return (
    isVoidType(returnTypeNode) ||
    (returnTypeNode.type === "TSUnionType" &&
      returnTypeNode.types.some(typeNode => declaredReturnTypeContainsVoidTypes(typeNode))) ||
    (returnTypeNode.type === "TSParenthesizedType" &&
      declaredReturnTypeContainsVoidTypes(returnTypeNode.typeAnnotation))
  );
}

function isVoidType(typeNode: TSESTree.TypeNode) {
  return typeNode.type === "TSUndefinedKeyword" || typeNode.type === "TSVoidKeyword";
}
