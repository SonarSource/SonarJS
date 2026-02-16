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
  getTypeFromTreeNode,
  interceptReport,
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the typescript-eslint no-unnecessary-type-assertion rule to suppress
 * false positives where type assertions genuinely narrow types.
 *
 * The upstream rule compares types using reference equality, which is defeated
 * by TypeScript's contextual generic inference: when casting a generic return
 * (e.g., `foo() as Bar`), TS infers the generic parameter from the assertion,
 * making both types appear identical.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as { node?: TSESTree.Node }).node;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        context.report(reportDescriptor);
        return;
      }

      if (shouldSuppressReport(node, services)) {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

function shouldSuppressReport(node: TSESTree.Node, services: RequiredParserServices): boolean {
  if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
    return shouldSuppressTypeAssertion(node, services);
  }
  return false;
}

/**
 * Suppress type assertion reports when:
 * - The assertion target is `any` or `unknown` (always changes type behavior)
 * - The expression is a call and the callee's declared return type differs from the assertion target
 */
function shouldSuppressTypeAssertion(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  services: RequiredParserServices,
): boolean {
  const checker = services.program.getTypeChecker();

  // Get the assertion target type from the type annotation
  const assertionTargetType = getTypeFromTreeNode(node as unknown as Rule.Node, services);

  // Suppress if casting to `any` or `unknown` - these always change type behavior
  if (assertionTargetType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) {
    return true;
  }

  // Check if the inner expression is a call/method call
  const expression = node.expression;
  if (expression.type === 'CallExpression') {
    return isDeclaredReturnTypeDifferent(expression, assertionTargetType, checker, services);
  }

  // For non-call expressions, check if the assertion target type is structurally
  // different from the expression type (handles generic variable access, etc.)
  const expressionType = getTypeFromTreeNode(expression as unknown as Rule.Node, services);

  if (!checker.isTypeAssignableTo(expressionType, assertionTargetType)) {
    return true;
  }

  return false;
}

/**
 * Checks if the callee's declared return type (without contextual generic inference)
 * differs from the assertion target type. We inspect the callee's declared
 * call signatures rather than the resolved signature to avoid the issue where
 * TypeScript infers the generic parameter from the assertion context.
 */
function isDeclaredReturnTypeDifferent(
  callExpression: TSESTree.CallExpression,
  assertionTargetType: ts.Type,
  checker: ts.TypeChecker,
  services: RequiredParserServices,
): boolean {
  // Get the callee's type to access its declared signatures
  const calleeType = getTypeFromTreeNode(callExpression.callee as unknown as Rule.Node, services);
  const signatures = calleeType.getCallSignatures();
  if (signatures.length === 0) {
    return false;
  }

  // Check if any declared signature has a return type that differs from the assertion target.
  // If a signature has type parameters, the return type is generic and the assertion
  // is needed to narrow it.
  for (const signature of signatures) {
    if (signature.typeParameters && signature.typeParameters.length > 0) {
      return true;
    }

    const declaredReturnType = checker.getReturnTypeOfSignature(signature);

    if (!checker.isTypeAssignableTo(declaredReturnType, assertionTargetType)) {
      return true;
    }
    if (!checker.isTypeAssignableTo(assertionTargetType, declaredReturnType)) {
      return true;
    }
  }

  return false;
}
