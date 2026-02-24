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
// https://sonarsource.github.io/rspec/#/rspec/S4325/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import {
  generateMeta,
  interceptReport,
  isNullOrUndefinedType,
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        context.report(reportDescriptor);
        return;
      }

      const node = (reportDescriptor as Rule.ReportDescriptor & { node: TSESTree.Node }).node;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      if (node.type === 'TSNonNullExpression') {
        if (isNonNullAssertionNecessary(node, services)) {
          return;
        }
      } else if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
        if (isTypeAssertionNecessary(node, services)) {
          return;
        }
      }

      context.report(reportDescriptor);
    },
  );
}

/**
 * Checks whether a non-null assertion is necessary by examining the declared type
 * of the inner expression. If the declared type includes null or undefined, the
 * assertion is needed.
 */
function isNonNullAssertionNecessary(
  node: TSESTree.TSNonNullExpression,
  services: RequiredParserServices,
): boolean {
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(node.expression);
  if (!tsNode) {
    return false;
  }

  const declaredType = getDeclaredType(checker, tsNode);
  return typeHasNullOrUndefined(declaredType);
}

/**
 * Checks whether a type assertion (as / angle-bracket) is necessary.
 *
 * Suppresses the report when:
 * 1. The assertion target is `any` or `unknown` (always changes type behavior).
 * 2. The inner expression is a call whose callee has a generic return type —
 *    the assertion instantiates the generic, making it genuinely necessary.
 * 3. The inner expression is a call and the assertion target is not assignable to
 *    the callee's declared return type (assertion genuinely narrows a union).
 */
function isTypeAssertionNecessary(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  services: RequiredParserServices,
): boolean {
  const checker = services.program.getTypeChecker();

  const assertionTsNode = services.esTreeNodeToTSNodeMap.get(node);
  if (!assertionTsNode) {
    return false;
  }

  const assertionTargetType = checker.getTypeAtLocation(assertionTsNode);

  // Casts to `any` or `unknown` always change the effective type behavior
  if (
    assertionTargetType.flags & ts.TypeFlags.Any ||
    assertionTargetType.flags & ts.TypeFlags.Unknown
  ) {
    return true;
  }

  const expression = node.expression;
  const exprTsNode = services.esTreeNodeToTSNodeMap.get(expression);
  if (!exprTsNode || !ts.isCallExpression(exprTsNode)) {
    return false;
  }

  // Get the callee's declared signatures (uninstantiated)
  const calleeType = checker.getTypeAtLocation(exprTsNode.expression);
  const callSignatures = calleeType.getCallSignatures();
  if (callSignatures.length === 0) {
    return false;
  }

  // Find the signature matching the resolved call
  const resolvedSignature = checker.getResolvedSignature(exprTsNode);
  const resolvedDecl = resolvedSignature?.getDeclaration();
  const matchedSignature = resolvedDecl
    ? callSignatures.find(sig => sig.getDeclaration() === resolvedDecl)
    : callSignatures[0];

  if (!matchedSignature) {
    return false;
  }

  // If the signature has type parameters, TypeScript infers them from the assertion
  // context, making the inferred return type equal to the assertion target by reference.
  // The assertion is necessary in this case.
  if (matchedSignature.typeParameters && matchedSignature.typeParameters.length > 0) {
    return true;
  }

  // For non-generic signatures: check if the declared return type is wider than
  // the assertion target (i.e., the assertion genuinely narrows the return type).
  const declaredReturnType = checker.getReturnTypeOfSignature(matchedSignature);
  // @ts-ignore private API
  return !checker.isTypeAssignableTo(declaredReturnType, assertionTargetType);
}

/**
 * Gets the declared type of a node, preferring the symbol's declared type
 * annotation over the flow-narrowed type.
 */
function getDeclaredType(checker: ts.TypeChecker, tsNode: ts.Node): ts.Type {
  const symbol = checker.getSymbolAtLocation(tsNode);
  if (symbol) {
    const declarations = symbol.getDeclarations();
    if (declarations && declarations.length > 0) {
      const decl = declarations[0];
      // Use the declared type annotation when present
      if (
        (ts.isVariableDeclaration(decl) ||
          ts.isParameter(decl) ||
          ts.isPropertyDeclaration(decl) ||
          ts.isPropertySignature(decl)) &&
        decl.type
      ) {
        return checker.getTypeFromTypeNode(decl.type);
      }
    }
    return checker.getTypeOfSymbol(symbol);
  }
  return checker.getTypeAtLocation(tsNode);
}

function typeHasNullOrUndefined(type: ts.Type): boolean {
  if (isNullOrUndefinedType(type)) {
    return true;
  }
  return type.isUnion() && type.types.some(isNullOrUndefinedType);
}
