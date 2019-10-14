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

    function functionLikeMainLocation(
      node: FunctionLikeDeclaration,
      parent?: estree.Node,
    ): estree.SourceLocation | undefined | null {
      let mainLocationHolder: AST.Token | estree.Node | null = null;
      if (!!node.id) {
        mainLocationHolder = node.id;
      } else if (!!parent && (parent.type === "MethodDefinition" || parent.type === "Property")) {
        mainLocationHolder = parent.key;
      } else if (node.type === "ArrowFunctionExpression") {
        mainLocationHolder = sourceCode.getFirstToken(
          node as estree.Node,
          token => token.value === "=>",
        );
      } else {
        mainLocationHolder = sourceCode.getFirstToken(
          node as estree.Node,
          token => token.value === "function",
        );
      }
      return !!mainLocationHolder ? mainLocationHolder.loc : null;
    }

    function getSecondaryLocations(
      functionContext: FunctionContext,
      hasImplicitReturn: boolean,
      node: estree.Node,
    ): [Array<AST.Token | TSESTree.Node>, Array<string>] {
      const secondaryLocationsHolder = functionContext.returnStatements.slice() as TSESTree.Node[];
      const secondaryLocationMessages: string[] = functionContext.returnStatements.map(
        returnStatement =>
          !returnStatement.argument ? "Return without value" : "Return with value",
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

    function checkFunctionLikeDeclaration(
      node: FunctionLikeDeclaration,
      functionContext?: FunctionContext,
    ) {
      if (!functionContext || declaredReturnTypeContainsVoidTypes(node.returnType)) {
        return;
      }

      const mainLocation = functionLikeMainLocation(node, getParent(context));
      const containsImplicitReturn = functionContext.codePath.currentSegments.some(
        segment => segment.reachable,
      );

      if (!!mainLocation && hasInconsistentReturns(functionContext, containsImplicitReturn)) {
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

function hasInconsistentReturns(
  functionContext: FunctionContext,
  containsImplicitReturn: boolean,
): boolean {
  return (
    functionContext.containsReturnWithValue &&
    (functionContext.containsReturnWithoutValue || containsImplicitReturn)
  );
}

function declaredReturnTypeContainsVoidTypes(returnTypeNode?: TSESTree.TSTypeAnnotation): boolean {
  if (!!returnTypeNode) {
    const returnType = returnTypeNode.typeAnnotation;
    return (
      isVoidType(returnType) ||
      (returnType.type === "TSUnionType" && !!returnType.types.find(isVoidType))
    );
  }
  return false;
}

function isVoidType(typeNode: TSESTree.TypeNode): boolean {
  return typeNode.type === "TSUndefinedKeyword" || typeNode.type === "TSVoidKeyword";
}
