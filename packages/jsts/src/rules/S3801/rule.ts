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
// https://sonarsource.github.io/rspec/#/rspec/S3801/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  report,
  RuleContext,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

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
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const functionContextStack: FunctionContext[] = [];
    const checkOnFunctionExit = (node: estree.Node) =>
      checkFunctionLikeDeclaration(
        node as FunctionLikeDeclaration,
        functionContextStack[functionContextStack.length - 1],
      );

    // tracks the segments we've traversed in the current code path
    let currentSegments: Set<Rule.CodePathSegment>;

    // tracks all current segments for all open paths
    const allCurrentSegments: Set<Rule.CodePathSegment>[] = [];

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
      functionContext.containsImplicitReturn = Array.from(currentSegments).some(
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
        allCurrentSegments.push(currentSegments);
        currentSegments = new Set();
      },
      onCodePathEnd() {
        functionContextStack.pop();
        currentSegments = allCurrentSegments.pop()!;
      },

      onCodePathSegmentStart(segment) {
        currentSegments.add(segment);
      },

      onCodePathSegmentEnd(segment) {
        currentSegments.delete(segment);
      },

      onUnreachableCodePathSegmentStart(segment: Rule.CodePathSegment) {
        currentSegments.add(segment);
      },

      onUnreachableCodePathSegmentEnd(segment: Rule.CodePathSegment) {
        currentSegments.delete(segment);
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
