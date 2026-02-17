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
 * Suppresses false positives for type assertions on call expressions with generic
 * return types. When the callee's declared return type is a type parameter or differs
 * structurally from the assertion target, the assertion genuinely narrows.
 *
 * Only suppresses when:
 * - The callee has type parameters that appear in its return type
 * - Those type parameters are NOT inferrable from function arguments
 * - There is no alternative contextual type (LHS annotation, return type, argument position)
 */
function shouldSuppressTypeAssertion(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
  services: RequiredParserServices,
): boolean {
  const expression = node.expression as estree.Node;

  // For call expressions, check if the callee is generic and the return type
  // involves type parameters. The upstream rule's reference-equality check is
  // defeated by TypeScript's contextual generic inference.
  if ((expression as TSESTree.Node).type === 'CallExpression') {
    if (!isCalleeReturnTypeParameterized(expression, services)) {
      return false;
    }
    // Even if the return type is parameterized, the assertion may be redundant
    // when there's an alternative source of contextual typing that would resolve
    // the generic parameter identically.
    if (hasAlternativeContextualType(node)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Checks whether a call expression invokes a generic function/method whose
 * declared return type references type parameters that cannot be inferred
 * from the function's arguments.
 *
 * Returns true when:
 * 1. The callee has type parameters in its declaration
 * 2. The declared return type references those type parameters
 * 3. The call does not provide explicit type arguments
 * 4. The type parameters in the return type do NOT also appear in parameter types
 *    (if they do, TypeScript can infer them from arguments, making the assertion redundant)
 */
function isCalleeReturnTypeParameterized(
  callExpression: estree.Node,
  services: RequiredParserServices,
): boolean {
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(callExpression as TSESTree.Node);
  if (!ts.isCallExpression(tsNode)) {
    return false;
  }

  // If the call provides explicit type arguments (e.g., foo<string>()),
  // the generic is already resolved and the assertion may be unnecessary.
  if (tsNode.typeArguments && tsNode.typeArguments.length > 0) {
    return false;
  }

  const signature = checker.getResolvedSignature(tsNode);
  if (!signature) {
    return false;
  }

  // Get the declaration to check for type parameters and return type
  const declaration = signature.getDeclaration();
  if (!declaration?.typeParameters || declaration.typeParameters.length === 0) {
    return false;
  }

  const typeParamNames = new Set(declaration.typeParameters.map(tp => tp.name.text));

  // Check if the declared return type references any of the type parameters.
  if (!declaration.type) {
    // No explicit return type annotation — check the inferred return type
    // to see if it actually involves type parameters. If the inferred type
    // is concrete (e.g., `string`), the assertion is genuinely unnecessary.
    const returnType = checker.getReturnTypeOfSignature(signature);
    if (!typeInvolvesTypeParameters(returnType)) {
      return false;
    }
    // The inferred return type involves type parameters. Check if they're
    // inferrable from the function's parameters.
    return !typeParamsInferrableFromParameters(declaration, typeParamNames);
  }

  if (!typeNodeReferencesTypeParam(declaration.type, typeParamNames)) {
    return false;
  }

  // The return type references type parameters. Check if those same type
  // parameters also appear in the function's parameter types. If they do,
  // TypeScript can infer the generic from the call arguments, making the
  // type assertion redundant.
  return !typeParamsInferrableFromParameters(declaration, typeParamNames);
}

/**
 * Checks whether any of the given type parameters appear in the function's
 * parameter type annotations in a direct (top-level) position where TypeScript
 * can reliably infer them from the call arguments.
 *
 * Only considers type parameters that appear directly in parameter types
 * (e.g., `param: T`, `param: T[]`, `param: SomeType<T>`), not those nested
 * inside function/method signatures within type literals (e.g., `param: { fn(): T }`),
 * where inference depends on the actual argument type and may not resolve correctly.
 */
function typeParamsInferrableFromParameters(
  declaration: ts.SignatureDeclaration,
  typeParamNames: Set<string>,
): boolean {
  for (const param of declaration.parameters) {
    if (param.type && typeNodeReferencesTypeParamDirectly(param.type, typeParamNames)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a type node directly references type parameters, excluding
 * references that are nested inside function/method signatures within type literals.
 * This is a more conservative check than typeNodeReferencesTypeParam — it only
 * finds type parameters in positions where TypeScript can directly infer them
 * from a call argument's type.
 */
function typeNodeReferencesTypeParamDirectly(
  typeNode: ts.TypeNode,
  typeParamNames: Set<string>,
): boolean {
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName;
    if (ts.isIdentifier(name) && typeParamNames.has(name.text)) {
      return true;
    }
    if (typeNode.typeArguments) {
      return typeNode.typeArguments.some(arg =>
        typeNodeReferencesTypeParamDirectly(arg, typeParamNames),
      );
    }
  }
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.some(t => typeNodeReferencesTypeParamDirectly(t, typeParamNames));
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return typeNodeReferencesTypeParamDirectly(typeNode.elementType, typeParamNames);
  }
  if (ts.isTupleTypeNode(typeNode)) {
    return typeNode.elements.some(e => typeNodeReferencesTypeParamDirectly(e, typeParamNames));
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return typeNodeReferencesTypeParamDirectly(typeNode.type, typeParamNames);
  }
  // Stop at type literals — type parameters inside method/function signatures
  // within type literals (e.g., { fn(): T }) are not directly inferrable from
  // the argument type.
  if (ts.isTypeLiteralNode(typeNode)) {
    return false;
  }
  // Stop at function types — type parameters inside callback signatures
  // are not directly inferrable from the argument type.
  if (ts.isFunctionTypeNode(typeNode) || ts.isConstructorTypeNode(typeNode)) {
    return false;
  }
  return false;
}

/**
 * Checks whether a TypeScript type (as resolved by the checker) involves
 * type parameters. This is used for functions without explicit return type
 * annotations to determine if the inferred return type is parameterized.
 */
function typeInvolvesTypeParameters(type: ts.Type): boolean {
  if (type.flags & ts.TypeFlags.TypeParameter) {
    return true;
  }
  if (type.isUnionOrIntersection()) {
    return type.types.some(typeInvolvesTypeParameters);
  }
  return false;
}

/**
 * Checks whether the type assertion node has an alternative source of contextual
 * typing that would resolve the generic parameter, making the assertion redundant.
 *
 * Alternative contextual type sources:
 * - LHS variable/property type annotation in an assignment or variable declaration
 * - Return type of the enclosing function (when in a return statement)
 * - Parameter type of an enclosing call expression (when used as an argument)
 */
function hasAlternativeContextualType(
  node: TSESTree.TSAsExpression | TSESTree.TSTypeAssertion,
): boolean {
  const parent = node.parent;
  if (!parent) {
    return false;
  }

  // Variable declaration: `let x: Type = expr as Type`
  if (parent.type === 'VariableDeclarator' && parent.id.typeAnnotation) {
    return true;
  }

  // Return statement: `return expr as Type` in a function with explicit return type
  if (parent.type === 'ReturnStatement') {
    return enclosingFunctionHasReturnType(parent);
  }

  // Assignment to a typed property: `this.prop = expr as Type` or `obj.prop = expr as Type`
  if (
    parent.type === 'AssignmentExpression' &&
    parent.right === node &&
    parent.left.type === 'MemberExpression'
  ) {
    return true;
  }

  // Function argument: `fn(expr as Type)` — parameter type provides context
  if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
    return true;
  }

  return false;
}

/**
 * Checks whether the enclosing function of a return statement has an explicit
 * return type annotation.
 */
function enclosingFunctionHasReturnType(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return current.returnType != null;
    }
    if (current.type === 'MethodDefinition' || current.type === 'Property') {
      const value = current.value;
      if (value.type === 'FunctionExpression' || value.type === 'ArrowFunctionExpression') {
        return value.returnType != null;
      }
      return false;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Checks whether a TypeScript type node references any of the given type parameter names.
 * This walks the type node AST to find TypeReference nodes that refer to type parameters.
 */
function typeNodeReferencesTypeParam(typeNode: ts.TypeNode, typeParamNames: Set<string>): boolean {
  if (ts.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName;
    if (ts.isIdentifier(name) && typeParamNames.has(name.text)) {
      return true;
    }
    // Check type arguments of the reference (e.g., Promise<T>)
    if (typeNode.typeArguments) {
      return typeNode.typeArguments.some(arg => typeNodeReferencesTypeParam(arg, typeParamNames));
    }
  }
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.some(t => typeNodeReferencesTypeParam(t, typeParamNames));
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return typeNodeReferencesTypeParam(typeNode.elementType, typeParamNames);
  }
  if (ts.isTupleTypeNode(typeNode)) {
    return typeNode.elements.some(e => typeNodeReferencesTypeParam(e, typeParamNames));
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return typeNodeReferencesTypeParam(typeNode.type, typeParamNames);
  }
  if (ts.isTypeLiteralNode(typeNode)) {
    return typeNode.members.some(member => {
      if ((ts.isPropertySignature(member) || ts.isMethodSignature(member)) && member.type) {
        return typeNodeReferencesTypeParam(member.type, typeParamNames);
      }
      return false;
    });
  }
  if (ts.isConditionalTypeNode(typeNode)) {
    return (
      typeNodeReferencesTypeParam(typeNode.checkType, typeParamNames) ||
      typeNodeReferencesTypeParam(typeNode.extendsType, typeParamNames) ||
      typeNodeReferencesTypeParam(typeNode.trueType, typeParamNames) ||
      typeNodeReferencesTypeParam(typeNode.falseType, typeParamNames)
    );
  }
  if (ts.isMappedTypeNode(typeNode) && typeNode.type) {
    return typeNodeReferencesTypeParam(typeNode.type, typeParamNames);
  }
  if (ts.isIndexedAccessTypeNode(typeNode)) {
    return (
      typeNodeReferencesTypeParam(typeNode.objectType, typeParamNames) ||
      typeNodeReferencesTypeParam(typeNode.indexType, typeParamNames)
    );
  }
  return false;
}

/**
 * Suppresses false positives for non-null assertions where the expression's
 * declared type explicitly includes null or undefined in its type annotation,
 * but only when strictNullChecks is NOT enabled.
 *
 * Without strictNullChecks, TypeScript resolves `Api | null` to just `Api`,
 * making the upstream rule's nullability checks fail. We check the syntax of the
 * type annotation directly to determine if the developer declared the type as nullable.
 *
 * When strictNullChecks IS enabled, the upstream rule's analysis is reliable
 * and we trust its determination.
 */
function shouldSuppressNonNullAssertion(
  node: TSESTree.TSNonNullExpression,
  services: RequiredParserServices,
): boolean {
  const compilerOptions = services.program.getCompilerOptions();

  // When strictNullChecks is enabled, the upstream rule correctly handles
  // nullability analysis including flow narrowing. Trust its determination.
  if (compilerOptions.strictNullChecks || compilerOptions.strict) {
    return false;
  }

  // Without strictNullChecks, TypeScript erases null/undefined from union types,
  // defeating the upstream rule's nullability checks. Check the declaration's
  // type annotation syntax directly.
  const expression = node.expression as estree.Node;
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(expression as TSESTree.Node);

  const symbol = checker.getSymbolAtLocation(tsNode);
  if (!symbol) {
    return false;
  }

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) {
    return false;
  }

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
