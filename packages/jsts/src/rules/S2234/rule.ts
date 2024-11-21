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
// https://sonarsource.github.io/rspec/#/rspec/S2234/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import {
  FunctionNodeType,
  generateMeta,
  getSignatureFromCallee,
  getTypeAsString,
  isFunctionNode,
  isRequiredParserServices,
  report,
  resolveFromFunctionReference,
  resolveIdentifiers,
  toSecondaryLocation,
} from '../helpers/index.js';
import { meta } from './meta.js';

interface FunctionSignature {
  params: Array<string | undefined>;
  declaration?: FunctionNodeType;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),

  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    const canResolveType = isRequiredParserServices(services);

    function checkArguments(functionCall: estree.CallExpression) {
      const resolvedFunction = resolveFunctionDeclaration(functionCall);
      if (!resolvedFunction) {
        return;
      }

      const { params: functionParameters, declaration: functionDeclaration } = resolvedFunction;
      const argumentNames = functionCall.arguments.map(arg => {
        const argument = arg as TSESTree.Node;
        return argument.type === 'Identifier' ? argument.name : undefined;
      });

      for (let argumentIndex = 0; argumentIndex < argumentNames.length; argumentIndex++) {
        const argumentName = argumentNames[argumentIndex];
        if (argumentName) {
          const swappedArgumentName = getSwappedArgumentName(
            argumentNames,
            functionParameters,
            argumentName,
            argumentIndex,
            functionCall,
          );
          if (
            swappedArgumentName &&
            !areComparedArguments([argumentName, swappedArgumentName], functionCall)
          ) {
            raiseIssue(argumentName, swappedArgumentName, functionDeclaration, functionCall);
            return;
          }
        }
      }
    }

    function areComparedArguments(argumentNames: string[], node: estree.Node): boolean {
      function getName(node: estree.Node): string | undefined {
        switch (node.type) {
          case 'Identifier':
            return node.name;
          case 'CallExpression':
            return getName(node.callee);
          case 'MemberExpression':
            return getName(node.object);
          default:
            return undefined;
        }
      }
      function checkComparedArguments(lhs: estree.Node, rhs: estree.Node): boolean {
        return (
          [lhs, rhs].map(getName).filter(name => name && argumentNames.includes(name)).length ===
          argumentNames.length
        );
      }
      const maybeIfStmt = context.sourceCode
        .getAncestors(node)
        .reverse()
        .find(ancestor => ancestor.type === 'IfStatement');
      if (maybeIfStmt) {
        const { test } = maybeIfStmt as estree.IfStatement;
        switch (test.type) {
          case 'BinaryExpression': {
            const binExpr = test;
            if (['==', '!=', '===', '!==', '<', '<=', '>', '>='].includes(binExpr.operator)) {
              const { left: lhs, right: rhs } = binExpr;
              return checkComparedArguments(lhs, rhs);
            }
            break;
          }

          case 'CallExpression': {
            const callExpr = test;
            if (callExpr.arguments.length === 1 && callExpr.callee.type === 'MemberExpression') {
              const [lhs, rhs] = [callExpr.callee.object, callExpr.arguments[0]];
              return checkComparedArguments(lhs, rhs);
            }
            break;
          }
        }
      }
      return false;
    }

    function resolveFunctionDeclaration(node: estree.CallExpression): FunctionSignature | null {
      if (canResolveType) {
        return resolveFromTSSignature(node);
      }

      let functionDeclaration: FunctionNodeType | null = null;

      if (isFunctionNode(node.callee)) {
        functionDeclaration = node.callee;
      } else if (node.callee.type === 'Identifier') {
        functionDeclaration = resolveFromFunctionReference(context, node.callee);
      }

      if (!functionDeclaration) {
        return null;
      }

      return {
        params: extractFunctionParameters(functionDeclaration),
        declaration: functionDeclaration,
      };
    }

    function resolveFromTSSignature(node: estree.CallExpression) {
      const signature = getSignatureFromCallee(node, services);
      if (signature?.declaration) {
        return {
          params: signature.parameters.map(param => param.name),
          declaration: services.tsNodeToESTreeNodeMap.get(signature.declaration),
        };
      }
      return null;
    }

    function getSwappedArgumentName(
      argumentNames: Array<string | undefined>,
      functionParameters: Array<string | undefined>,
      argumentName: string,
      argumentIndex: number,
      node: estree.CallExpression,
    ) {
      const indexInFunctionDeclaration = functionParameters.findIndex(
        functionParameterName => functionParameterName === argumentName,
      );
      if (indexInFunctionDeclaration >= 0 && indexInFunctionDeclaration !== argumentIndex) {
        const potentiallySwappedArgument = argumentNames[indexInFunctionDeclaration];
        if (
          potentiallySwappedArgument &&
          potentiallySwappedArgument === functionParameters[argumentIndex] &&
          haveCompatibleTypes(
            node.arguments[argumentIndex],
            node.arguments[indexInFunctionDeclaration],
          )
        ) {
          return potentiallySwappedArgument;
        }
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

    function raiseIssue(
      arg1: string,
      arg2: string,
      functionDeclaration: FunctionNodeType | undefined,
      node: estree.CallExpression,
    ) {
      report(
        context,
        {
          message: `Arguments '${arg1}' and '${arg2}' have the same names but not the same order as the function parameters.`,
          loc: getParametersClauseLocation(node.arguments),
        },
        getSecondaryLocations(functionDeclaration),
      );
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

function extractFunctionParameters(functionDeclaration: FunctionNodeType) {
  return functionDeclaration.params.map(param => {
    const identifiers = resolveIdentifiers(param as TSESTree.Node);
    if (identifiers.length === 1 && identifiers[0]) {
      return identifiers[0].name;
    }
    return undefined;
  });
}

function getSecondaryLocations(functionDeclaration: FunctionNodeType | undefined) {
  if (functionDeclaration?.params && functionDeclaration.params.length > 0) {
    const { start, end } = getParametersClauseLocation(functionDeclaration.params);
    return [toSecondaryLocation({ loc: { start, end } }, 'Formal parameters')];
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
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    case 'Number':
      return 'number';
    default:
      return typeAsString;
  }
}
