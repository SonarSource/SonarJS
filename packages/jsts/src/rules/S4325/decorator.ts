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
 * Suppresses false positives for type assertions on call expressions where the
 * callee's declared return type differs from the assertion target due to generic
 * inference or contextual typing. Also suppresses assertions that narrow `any`
 * to a specific type, which occurs when modules are unresolved or functions
 * return `any`.
 */
function shouldSuppressTypeAssertion(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  services: RequiredParserServices,
): boolean {
  const expression = node.expression as estree.Node;
  const checker = services.program.getTypeChecker();

  // For call expressions, check the callee's declared return type
  if ((expression as TSESTree.Node).type === 'CallExpression') {
    if (shouldSuppressCallAssertion(node, expression, services)) {
      return true;
    }
  }

  // General check: if the expression's type is `any` and the assertion narrows
  // to a genuine non-any type, the assertion is meaningful.
  // When the expression is `any` (e.g., from unresolved modules) and the
  // annotation also resolves to `any` (e.g., `ReturnType<typeof UnresolvedFn>`),
  // the assertion is effectively `any → any` and genuinely unnecessary.
  const exprTsNode = services.esTreeNodeToTSNodeMap.get(expression as TSESTree.Node);
  const exprType = checker.getTypeAtLocation(exprTsNode);
  if (exprType.flags & ts.TypeFlags.Any) {
    if (!isAnyKeywordAnnotation(node) && !assertionResolvesToAny(node, services)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a type assertion on a call expression result should be suppressed.
 *
 * The upstream rule compares types using reference equality. This fails when:
 * 1. The callee is generic — TypeScript infers the generic from the assertion context
 * 2. The callee's declared return type contains `any` — TypeScript contextually resolves
 *    `any` to the assertion target type
 * 3. The callee's declared return type is a type parameter reference
 *
 * In all these cases, the assertion genuinely narrows the type even though TypeScript
 * makes both types appear identical via contextual inference.
 *
 * Exception: when the assertion target is itself `any`, the assertion doesn't narrow
 * and should still be flagged (e.g., `<any>fn()` where fn returns `any`).
 */
function shouldSuppressCallAssertion(
  assertionNode: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  callExpression: estree.Node,
  services: RequiredParserServices,
): boolean {
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

  // Check the declaration's type parameters directly.
  // getResolvedSignature() returns an instantiated signature where type parameters
  // have been substituted, so getTypeParameters() may return undefined.
  // The declaration still retains the original type parameter list.
  const declaration = signature.getDeclaration();
  if (declaration?.typeParameters && declaration.typeParameters.length > 0) {
    return true;
  }

  // Check if the declared return type contains `any` or a type parameter reference.
  // When a function returns `any`, TypeScript contextually infers the assertion target
  // type, making both types reference-equal. The assertion genuinely narrows `any`.
  // Exception: if the assertion's type annotation resolves to `any` (either literally
  // `any` or an unresolved type reference), the cast is effectively `any → any` and
  // genuinely unnecessary — don't suppress.
  if (declaration?.type && returnTypeNodeContainsAnyOrTypeParam(declaration.type)) {
    if (
      !isAnyKeywordAnnotation(assertionNode) &&
      !assertionResolvesToAny(assertionNode, services)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if the type annotation in a type assertion node is literally the `any` keyword.
 * This examines the ESTree AST syntax rather than the resolved type, because unresolved
 * type references (e.g., `typeof UnresolvedModule`) resolve to `any` but represent
 * intentional narrowing, not a bare `any` cast.
 */
function isAnyKeywordAnnotation(node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion): boolean {
  const annotation = node.typeAnnotation;
  return annotation.type === 'TSAnyKeyword';
}

/**
 * Checks whether the assertion's type annotation resolves to `any` according to the
 * type checker. This catches cases where the annotation is syntactically a type
 * reference (e.g., `ReturnType<typeof unresolved>`, `SomeUnresolvedType`) but resolves
 * to `any` because the referenced types are from unresolved modules. In such cases,
 * the assertion is effectively `any → any` and genuinely unnecessary.
 */
function assertionResolvesToAny(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  services: RequiredParserServices,
): boolean {
  const checker = services.program.getTypeChecker();
  // The type of a TSAsExpression/TSTypeAssertion node IS the asserted type.
  const tsNode = services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node);
  if (!tsNode) {
    return false;
  }
  const assertedType = checker.getTypeAtLocation(tsNode);
  return !!(assertedType.flags & ts.TypeFlags.Any);
}

/**
 * Checks whether a return type node contains `any`, `unknown`, or a type parameter
 * reference. These indicate the return type is broad/generic and an assertion
 * meaningfully narrows it.
 */
function returnTypeNodeContainsAnyOrTypeParam(typeNode: ts.TypeNode): boolean {
  if (typeNode.kind === ts.SyntaxKind.AnyKeyword) {
    return true;
  }
  if (typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
    return true;
  }
  if (ts.isTypeReferenceNode(typeNode) && !typeNode.typeArguments) {
    // A bare type reference without arguments could be a type parameter
    // We check this recursively when it's part of a union
    return false;
  }
  if (ts.isUnionTypeNode(typeNode)) {
    return typeNode.types.some(returnTypeNodeContainsAnyOrTypeParam);
  }
  if (ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.some(returnTypeNodeContainsAnyOrTypeParam);
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return returnTypeNodeContainsAnyOrTypeParam(typeNode.type);
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
    if (checkIfStatementNarrowing(node, current, exprText)) {
      return true;
    }

    if (checkLogicalExpressionNarrowing(node, current, exprText)) {
      return true;
    }

    if (checkConditionalExpressionNarrowing(node, current, exprText)) {
      return true;
    }

    if (checkEarlyReturnNarrowing(node, current, exprText)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

/**
 * Checks if the node is narrowed by an if statement (either in consequent or alternate).
 */
function checkIfStatementNarrowing(
  node: TSESTree.TSNonNullExpression,
  current: TSESTree.Node,
  exprText: string,
): boolean {
  if (current.type !== 'IfStatement') {
    return false;
  }

  // Check if we're in the consequent and test narrows the expression
  if (isInConsequent(node, current) && testNarrowsExpression(current.test, exprText)) {
    return true;
  }

  // Check if we're in the alternate branch after a null check
  if (current.alternate && isDescendantOf(node, current.alternate)) {
    return testNarrowsNullish(current.test, exprText);
  }

  return false;
}

/**
 * Checks if the node is narrowed by a logical AND expression (x && x!).
 */
function checkLogicalExpressionNarrowing(
  node: TSESTree.TSNonNullExpression,
  current: TSESTree.Node,
  exprText: string,
): boolean {
  if (current.type !== 'LogicalExpression') {
    return false;
  }

  return (
    current.operator === '&&' &&
    isDescendantOf(node, current.right) &&
    testNarrowsExpression(current.left, exprText)
  );
}

/**
 * Checks if the node is narrowed by a conditional expression (x ? x! : y).
 */
function checkConditionalExpressionNarrowing(
  node: TSESTree.TSNonNullExpression,
  current: TSESTree.Node,
  exprText: string,
): boolean {
  if (current.type !== 'ConditionalExpression') {
    return false;
  }

  return isDescendantOf(node, current.consequent) && testNarrowsExpression(current.test, exprText);
}

/**
 * Checks if the node is narrowed by an early-return guard in a block.
 */
function checkEarlyReturnNarrowing(
  node: TSESTree.TSNonNullExpression,
  current: TSESTree.Node,
  exprText: string,
): boolean {
  if (!isBlockLike(current)) {
    return false;
  }

  return hasEarlyReturnNarrowingGuard(node, current, exprText);
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
 * Checks if a test expression narrows the given variable by checking for null/undefined.
 * Handles patterns like: `x == null`, `x === null`, `x === undefined`, `x == null || x === ''`
 */
function testNarrowsNullish(test: TSESTree.Node, exprText: string): boolean {
  // Direct: x == null, x === null, x === undefined
  if (test.type === 'BinaryExpression') {
    if (test.operator === '==' || test.operator === '===') {
      const leftText = getExpressionText(test.left as TSESTree.Node);
      const rightText = getExpressionText(test.right as TSESTree.Node);
      if (leftText === exprText && isNullishLiteral(test.right as TSESTree.Node)) {
        return true;
      }
      if (rightText === exprText && isNullishLiteral(test.left as TSESTree.Node)) {
        return true;
      }
    }
  }

  // Logical OR: x == null || x === ''  (still narrows x for null)
  if (test.type === 'LogicalExpression' && test.operator === '||') {
    if (
      testNarrowsNullish(test.left as TSESTree.Node, exprText) ||
      testNarrowsNullish(test.right as TSESTree.Node, exprText)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a node is a `null` or `undefined` literal.
 */
function isNullishLiteral(node: TSESTree.Node): boolean {
  if (node.type === 'Literal' && node.value === null) {
    return true;
  }
  if (node.type === 'Identifier' && node.name === 'undefined') {
    return true;
  }
  return false;
}

/**
 * Checks if a node is a block-like container (BlockStatement, Program, or SwitchCase).
 */
function isBlockLike(node: TSESTree.Node): boolean {
  return node.type === 'BlockStatement' || node.type === 'Program' || node.type === 'SwitchCase';
}

/**
 * Checks if there's an early-return guard for the given variable in a block.
 * Detects patterns like:
 *   if (!x) return;
 *   if (!x) throw ...;
 *   if (x == null) return;
 *   // ... x! ...  ← the `!` is unnecessary because the early return narrowed x
 */
function hasEarlyReturnNarrowingGuard(
  node: TSESTree.TSNonNullExpression,
  block: TSESTree.Node,
  exprText: string,
): boolean {
  const body = getBlockBody(block);

  for (const stmt of body) {
    if (isStatementAfterNode(stmt, node)) {
      break;
    }

    if (isEarlyReturnGuardStatement(stmt, exprText)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the body of a block-like node.
 */
function getBlockBody(block: TSESTree.Node): TSESTree.Statement[] {
  if (block.type === 'BlockStatement' || block.type === 'Program') {
    return block.body;
  }
  if (block.type === 'SwitchCase') {
    return block.consequent;
  }
  return [];
}

/**
 * Checks if a statement comes after the given node in source order.
 */
function isStatementAfterNode(
  stmt: TSESTree.Statement,
  node: TSESTree.TSNonNullExpression,
): boolean {
  return !!(stmt.range && node.range && stmt.range[0] >= node.range[0]);
}

/**
 * Checks if a statement is an early-return guard that narrows the expression.
 */
function isEarlyReturnGuardStatement(stmt: TSESTree.Statement, exprText: string): boolean {
  if (stmt.type !== 'IfStatement' || !isEarlyExit(stmt.consequent)) {
    return false;
  }

  return isNegatedNarrowingTest(stmt.test, exprText) || testNarrowsNullish(stmt.test, exprText);
}

/**
 * Checks if a statement is an early exit (return, throw, break, continue).
 */
function isEarlyExit(stmt: TSESTree.Statement): boolean {
  if (
    stmt.type === 'ReturnStatement' ||
    stmt.type === 'ThrowStatement' ||
    stmt.type === 'BreakStatement' ||
    stmt.type === 'ContinueStatement'
  ) {
    return true;
  }
  // A block with a single early-exit statement
  if (stmt.type === 'BlockStatement' && stmt.body.length > 0) {
    const lastStmt = stmt.body.at(-1)!;
    return isEarlyExit(lastStmt);
  }
  return false;
}

/**
 * Checks if a test is a negated truthiness check on the expression.
 * Handles: !x, !(x)
 */
function isNegatedNarrowingTest(test: TSESTree.Node, exprText: string): boolean {
  if (test.type === 'UnaryExpression' && test.operator === '!') {
    const argText = getExpressionText(test.argument as TSESTree.Node);
    return argText === exprText;
  }
  return false;
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
