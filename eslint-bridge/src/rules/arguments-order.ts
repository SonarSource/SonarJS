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
// https://jira.sonarsource.com/browse/RSPEC-2234

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import {
  FunctionNodeType,
  isFunctionNode,
  getSignatureFromCallee,
  getTypeAsString,
  resolveIdentifiers,
} from "./utils";
import { isRequiredParserServices } from "../utils/isRequiredParserServices";
import { EncodedMessage } from "eslint-plugin-sonarjs/lib/utils/locations";
import { isIdentifier } from "eslint-plugin-sonarjs/lib/utils/nodes";

interface FunctionSignature {
  params: Array<string | undefined>;
  declaration?: FunctionNodeType;
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
    const services = context.parserServices;
    const canResolveType = isRequiredParserServices(services);

    function resolveFunctionDeclaration(node: estree.CallExpression): FunctionSignature | null {
      if (canResolveType) {
        const signature = getSignatureFromCallee(node, services);
        if (signature && signature.declaration) {
          return {
            params: signature.parameters.map(param => param.name),
            declaration: services.tsNodeToESTreeNodeMap.get(signature.declaration),
          };
        }
      }

      let functionDeclaration: FunctionNodeType | undefined;
      const callee = node.callee;
      if (callee.type === "Identifier") {
        const functionReference = context
          .getScope()
          .references.find(ref => ref.identifier === callee);
        if (
          functionReference &&
          functionReference.resolved &&
          functionReference.resolved.defs.length === 1 &&
          functionReference.resolved.defs[0] &&
          functionReference.resolved.defs[0].type === "FunctionName"
        ) {
          functionDeclaration = functionReference.resolved.defs[0].node;
        }
      } else if (isFunctionNode(callee)) {
        functionDeclaration = callee;
      }

      if (functionDeclaration) {
        const functionParameters = functionDeclaration.params.map(param => {
          const identifiers = resolveIdentifiers(param as TSESTree.Node);
          if (identifiers.length === 1 && identifiers[0]) {
            return identifiers[0].name;
          }
          return undefined;
        });

        return {
          params: functionParameters,
          declaration: functionDeclaration,
        };
      }

      return null;
    }

    function haveCompatibleTypes(arg1: estree.Node, arg2: estree.Node) {
      if (canResolveType) {
        const type1 = normalizeType(getTypeAsString(arg1, services));
        const type2 = normalizeType(getTypeAsString(arg2, services));

        return type1 === type2;
      }
      return true;
    }

    function checkArguments(node: estree.CallExpression) {
      const resolvedFunction = resolveFunctionDeclaration(node);
      if (!resolvedFunction) {
        return;
      }

      const { params: functionParameters, declaration: functionDeclaration } = resolvedFunction;
      const argumentNames = node.arguments.map(arg => (isIdentifier(arg) ? arg.name : undefined));

      for (let argumentIndex = 0; argumentIndex < argumentNames.length; argumentIndex++) {
        const argumentName = argumentNames[argumentIndex];
        if (argumentName) {
          const indexInFunctionDeclaration = functionParameters.findIndex(
            functionParameterName => functionParameterName === argumentName,
          );
          if (indexInFunctionDeclaration >= 0 && indexInFunctionDeclaration != argumentIndex) {
            const potentiallySwappedArgument = argumentNames[indexInFunctionDeclaration];
            if (
              potentiallySwappedArgument &&
              potentiallySwappedArgument === functionParameters[argumentIndex] &&
              haveCompatibleTypes(
                node.arguments[argumentIndex],
                node.arguments[indexInFunctionDeclaration],
              )
            ) {
              const primaryMessage = `Arguments '${argumentName}' and '${potentiallySwappedArgument}' have the same names but not the same order as the function parameters.`;
              const encodedMessage: EncodedMessage = {
                message: primaryMessage,
                secondaryLocations: getSecondaryLocations(functionDeclaration),
              };

              context.report({
                message: JSON.stringify(encodedMessage),
                loc: getParametersClauseLocation(node.arguments),
              });
              return;
            }
          }
        }
      }
    }

    return {
      NewExpression: (node: estree.Node) => {
        checkArguments(node as estree.NewExpression);
      },
      CallExpression: (node: estree.Node) => {
        checkArguments(node as estree.CallExpression);
      },
    };
  },
};

function getSecondaryLocations(functionDeclaration: FunctionNodeType | undefined) {
  if (functionDeclaration && functionDeclaration.params && functionDeclaration.params.length > 0) {
    const { start, end } = getParametersClauseLocation(functionDeclaration.params);
    return [
      {
        message: "Formal parameters",
        line: start.line,
        column: start.column,
        endLine: end.line,
        endColumn: end.column,
      },
    ];
  }
  return [];
}

function getParametersClauseLocation(parameters: Array<estree.Node>) {
  const firstParam = parameters[0] as TSESTree.Node;
  const lastParam = parameters[parameters.length - 1] as TSESTree.Node;
  return { start: firstParam.loc.start, end: lastParam.loc.end };
}

function normalizeType(typeAsString: string) {
  switch (typeAsString) {
    case "String":
      return "string";
    case "Boolean":
      return "boolean";
    case "Number":
      return "number";
    default:
      return typeAsString;
  }
}
