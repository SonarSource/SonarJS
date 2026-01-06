/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import type estree from 'estree';
import ts from 'typescript';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  getTypeFromTreeNode,
  isRequiredParserServices,
  report,
  RequiredParserServices,
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
  switchStatements: estree.SwitchStatement[];
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
    const services = sourceCode.parserServices;
    const hasTypeInformation = isRequiredParserServices(services);
    const functionContextStack: FunctionContext[] = [];
    const checkOnFunctionExit = (node: estree.Node) =>
      checkFunctionLikeDeclaration(
        node as FunctionLikeDeclaration,
        functionContextStack.at(-1),
        hasTypeInformation ? services : undefined,
      );

    // tracks the segments we've traversed in the current code path
    let currentSegments: Set<Rule.CodePathSegment>;

    // tracks all current segments for all open paths
    const allCurrentSegments: Set<Rule.CodePathSegment>[] = [];

    function checkFunctionLikeDeclaration(
      node: FunctionLikeDeclaration,
      functionContext?: FunctionContext,
      services?: RequiredParserServices,
    ) {
      if (
        !functionContext ||
        (!!node.returnType &&
          declaredReturnTypeContainsVoidOrNeverTypes(node.returnType.typeAnnotation))
      ) {
        return;
      }

      checkFunctionForImplicitReturn(functionContext, services);

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

    function checkFunctionForImplicitReturn(
      functionContext: FunctionContext,
      services?: RequiredParserServices,
    ) {
      // As this method is called at the exit point of a function definition, the current
      // segments are the ones leading to the exit point at the end of the function. If they
      // are reachable, it means there is an implicit return.
      const hasReachableSegment = Array.from(currentSegments).some(segment => segment.reachable);

      if (hasReachableSegment && services) {
        // Check if any exhaustive switch makes the implicit return unreachable
        // TypeScript knows exhaustive switches make subsequent code unreachable,
        // but ESLint's code path analysis doesn't account for this
        const hasExhaustiveSwitch = functionContext.switchStatements.some(switchStmt =>
          isExhaustiveSwitch(switchStmt, services),
        );
        functionContext.containsImplicitReturn = !hasExhaustiveSwitch;
      } else {
        functionContext.containsImplicitReturn = hasReachableSegment;
      }
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
          switchStatements: [],
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
        const currentContext = functionContextStack.at(-1);
        if (!!currentContext) {
          const returnStatement = node as estree.ReturnStatement;
          currentContext.containsReturnWithValue =
            currentContext.containsReturnWithValue || !!returnStatement.argument;
          currentContext.containsReturnWithoutValue =
            currentContext.containsReturnWithoutValue || !returnStatement.argument;
          currentContext.returnStatements.push(returnStatement);
        }
      },
      SwitchStatement(node: estree.Node) {
        const currentContext = functionContextStack.at(-1);
        if (currentContext) {
          currentContext.switchStatements.push(node as estree.SwitchStatement);
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

/**
 * Checks if a switch statement is exhaustive over a union/enum type and all cases exit.
 * This is used to detect when ESLint's code path analysis incorrectly thinks there's an implicit
 * return, when in fact TypeScript knows the code after the switch is unreachable.
 */
function isExhaustiveSwitch(
  switchStmt: estree.SwitchStatement,
  services: RequiredParserServices,
): boolean {
  // If there's a default case, the switch handles all possible values
  const hasDefaultCase = switchStmt.cases.some(c => c.test === null);

  if (!hasDefaultCase) {
    // Without a default, we need to verify all union/enum members are covered
    const discriminantType = getTypeFromTreeNode(switchStmt.discriminant, services);
    const types = discriminantType.isUnion() ? discriminantType.types : [discriminantType];

    // Must be a union or enum type to be exhaustive without a default
    if (types.length <= 1 && !isEnumType(discriminantType)) {
      return false;
    }

    // Collect all case test values
    const coveredTypes = new Set<ts.Type>();
    for (const caseClause of switchStmt.cases) {
      if (caseClause.test) {
        const testType = getTypeFromTreeNode(caseClause.test, services);
        if (testType.isUnion()) {
          testType.types.forEach(t => coveredTypes.add(t));
        } else {
          coveredTypes.add(testType);
        }
      }
    }

    // Check if all types are covered
    const checker = services.program.getTypeChecker();
    const allTypesCovered = types.every(type =>
      Array.from(coveredTypes).some(covered => checker.isTypeAssignableTo(type, covered)),
    );

    if (!allTypesCovered) {
      return false;
    }
  }

  // Check if all cases exit (return or throw) - we check the last statement only
  // Empty cases fall through to the next case, which is handled by ESLint's code path analysis
  return switchStmt.cases.every(caseClause => {
    const statements = caseClause.consequent;
    if (statements.length === 0) {
      // Empty case - falls through to next case, which is fine
      return true;
    }
    return lastStatementExits(statements);
  });
}

/**
 * Checks if the last non-break statement in a list exits (return/throw).
 * Only checks direct returns/throws, not complex control flow.
 */
function lastStatementExits(statements: estree.Statement[]): boolean {
  // Find the last non-break statement (break after return is unreachable but valid syntax)
  for (let i = statements.length - 1; i >= 0; i--) {
    const stmt = statements[i];
    if (stmt.type === 'BreakStatement') {
      continue; // Skip break statements
    }
    if (stmt.type === 'ReturnStatement' || stmt.type === 'ThrowStatement') {
      return true;
    }
    if (stmt.type === 'BlockStatement') {
      return lastStatementExits(stmt.body);
    }
    // For other statement types (if, for, while, etc.), we don't try to analyze
    // and conservatively return false - let ESLint handle those paths
    return false;
  }
  return false;
}

function isEnumType(type: ts.Type): boolean {
  return (
    (type.flags & ts.TypeFlags.EnumLike) !== 0 ||
    (type.flags & ts.TypeFlags.EnumLiteral) !== 0 ||
    type.symbol?.flags === ts.SymbolFlags.EnumMember
  );
}
