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
import type estree from 'estree';
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
 * Decorates the typescript-eslint/no-unnecessary-type-assertion rule to suppress
 * false positives where type assertions genuinely narrow types.
 *
 * The upstream rule compares types using reference equality. When a type assertion
 * targets the return of a generic function (e.g., `foo() as HTMLElement`), TypeScript
 * infers the generic parameter from the assertion itself, making both types identical
 * objects. The rule then incorrectly considers the assertion unnecessary.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor)) {
        context.report(reportDescriptor);
        return;
      }

      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        context.report(reportDescriptor);
        return;
      }

      const node = reportDescriptor.node as TSESTree.Node;

      if (node.type === 'TSAsExpression' || node.type === 'TSTypeAssertion') {
        if (shouldSuppressTypeAssertion(node, services)) {
          return;
        }
      }

      if (node.type === 'TSNonNullExpression') {
        if (shouldSuppressNonNullAssertion(node, services)) {
          return;
        }
      }

      context.report(reportDescriptor);
    },
  );
}

/**
 * Suppresses false positives for type assertions on call expressions with generic
 * return types. When the callee's declared return type is a type parameter or differs
 * structurally from the assertion target, the assertion genuinely narrows.
 */
function shouldSuppressTypeAssertion(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  services: RequiredParserServices,
): boolean {
  const expression = node.expression as estree.Node;

  // Get the assertion's target type from the type annotation
  const assertionTargetType = getTypeFromTreeNode(node as unknown as estree.Node, services);

  // Suppress if the assertion target is `any` or `unknown` — these always change type behavior
  if (
    assertionTargetType.flags === ts.TypeFlags.Any ||
    assertionTargetType.flags === ts.TypeFlags.Unknown
  ) {
    return true;
  }

  // For call expressions, check the callee's declared return type
  if ((expression as TSESTree.Node).type === 'CallExpression') {
    return isCalleeGeneric(expression, services);
  }

  return false;
}

/**
 * Checks whether a call expression invokes a generic function/method.
 * When the callee has type parameters, TypeScript infers the generic from
 * the assertion context, causing the upstream rule's reference-equality check
 * to see both types as the same object.
 *
 * Uses the signature's declaration to check for type parameters, since
 * getResolvedSignature() returns an instantiated signature where
 * getTypeParameters() may return undefined.
 */
function isCalleeGeneric(callExpression: estree.Node, services: RequiredParserServices): boolean {
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(callExpression as TSESTree.Node);
  if (!ts.isCallExpression(tsNode)) {
    return false;
  }

  const signature = checker.getResolvedSignature(tsNode);
  if (!signature) {
    return false;
  }

  // Check the resolved signature's type parameters first
  const typeParameters = signature.getTypeParameters();
  if (typeParameters && typeParameters.length > 0) {
    return true;
  }

  // Fallback: check the declaration's type parameters directly.
  // getResolvedSignature() returns an instantiated signature where type parameters
  // have been substituted, so getTypeParameters() may return undefined.
  // The declaration still retains the original type parameter list.
  const declaration = signature.getDeclaration();
  if (declaration?.typeParameters && declaration.typeParameters.length > 0) {
    return true;
  }

  return false;
}

/**
 * Suppresses false positives for non-null assertions where the expression's
 * declared type explicitly includes null or undefined in its type annotation.
 *
 * Without strictNullChecks, TypeScript resolves `Api | null` to just `Api`,
 * making the upstream rule's nullability checks fail. We check the syntax of the
 * type annotation directly to determine if the developer declared the type as nullable.
 *
 * However, if control flow analysis has already narrowed the variable (e.g. inside
 * an `if (x)` guard), the non-null assertion is genuinely unnecessary and we
 * should let the upstream report through.
 */
function shouldSuppressNonNullAssertion(
  node: TSESTree.TSNonNullExpression,
  services: RequiredParserServices,
): boolean {
  const expression = node.expression as estree.Node;
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(expression as TSESTree.Node);

  // If the expression is inside a narrowing guard that tests the same variable,
  // the non-null assertion is genuinely unnecessary — don't suppress.
  if (isInsideNarrowingGuard(node)) {
    return false;
  }

  // Get the symbol for the expression to find its declaration
  const symbol = checker.getSymbolAtLocation(tsNode);
  if (!symbol) {
    return false;
  }

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) {
    return false;
  }

  // Check each declaration for an explicit nullable type annotation
  for (const decl of declarations) {
    if (
      (ts.isPropertyDeclaration(decl) || ts.isVariableDeclaration(decl) || ts.isParameter(decl)) &&
      decl.type
    ) {
      if (typeNodeContainsNullOrUndefined(decl.type)) {
        return true;
      }
    }
  }

  // Also check the resolved type (works when strictNullChecks is enabled)
  const resolvedType = checker.getTypeAtLocation(tsNode);
  if (resolvedType.isUnion()) {
    return resolvedType.types.some(t => !!(t.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)));
  }

  return false;
}

/**
 * Checks if the non-null assertion expression is inside a narrowing guard
 * (e.g., `if (x)`, `x && x!`, `x ? x! : y`) that tests the same variable.
 * When the variable has already been narrowed by a truthiness/type check,
 * the `!` is genuinely unnecessary.
 */
function isInsideNarrowingGuard(node: TSESTree.TSNonNullExpression): boolean {
  const expression = node.expression;

  // Only handle simple identifiers and member expressions for narrowing detection
  const exprText = getExpressionText(expression);
  if (!exprText) {
    return false;
  }

  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    // Check if we're in the consequent of an IfStatement whose test narrows the expression
    if (current.type === 'IfStatement' && isInConsequent(node, current)) {
      if (testNarrowsExpression(current.test, exprText)) {
        return true;
      }
    }

    // Check if we're on the right side of a logical AND (x && x!)
    if (
      current.type === 'LogicalExpression' &&
      current.operator === '&&' &&
      isDescendantOf(node, current.right)
    ) {
      if (testNarrowsExpression(current.left, exprText)) {
        return true;
      }
    }

    // Check if we're in the consequent of a conditional expression (x ? x! : y)
    if (current.type === 'ConditionalExpression' && isDescendantOf(node, current.consequent)) {
      if (testNarrowsExpression(current.test, exprText)) {
        return true;
      }
    }

    current = current.parent;
  }

  return false;
}

/**
 * Gets a comparable text representation for an expression.
 * Returns the identifier name for simple identifiers, or a dotted path for member expressions.
 */
function getExpressionText(node: TSESTree.Node): string | undefined {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'ThisExpression') {
    return 'this';
  }
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    const objectText = getExpressionText(node.object as TSESTree.Node);
    if (objectText) {
      return `${objectText}.${node.property.name}`;
    }
  }
  return undefined;
}

/**
 * Checks if a test expression narrows the given variable by testing it for truthiness.
 */
function testNarrowsExpression(test: TSESTree.Node, exprText: string): boolean {
  const testText = getExpressionText(test);
  return testText === exprText;
}

/**
 * Checks if the node is inside the consequent (then branch) of an IfStatement.
 */
function isInConsequent(node: TSESTree.Node, ifStmt: TSESTree.IfStatement): boolean {
  return isDescendantOf(node, ifStmt.consequent);
}

/**
 * Checks if `node` is a descendant of `ancestor`.
 */
function isDescendantOf(node: TSESTree.Node, ancestor: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Checks whether a type node's syntax explicitly contains `null` or `undefined`.
 * This examines the AST directly rather than relying on the type checker,
 * which may erase null/undefined when strictNullChecks is not enabled.
 */
function typeNodeContainsNullOrUndefined(typeNode: ts.TypeNode): boolean {
  if (typeNode.kind === ts.SyntaxKind.NullKeyword) {
    return true;
  }
  if (typeNode.kind === ts.SyntaxKind.UndefinedKeyword) {
    return true;
  }
  // LiteralType wrapping null: `null` in a union is represented as LiteralType
  if (ts.isLiteralTypeNode(typeNode) && typeNode.literal.kind === ts.SyntaxKind.NullKeyword) {
    return true;
  }
  if (ts.isUnionTypeNode(typeNode)) {
    return typeNode.types.some(typeNodeContainsNullOrUndefined);
  }
  return false;
}
