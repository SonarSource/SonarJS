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
 * Checks whether a call expression invokes a generic function/method whose
 * return type depends on a type parameter.
 *
 * When the callee has type parameters that influence the return type, TypeScript
 * infers the generic from the assertion context, causing the upstream rule's
 * reference-equality check to see both types as the same object.
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

  const declaration = signature.getDeclaration();
  const hasDeclarationTypeParams = (declaration?.typeParameters?.length ?? 0) > 0;
  const hasSignatureTypeParams = (signature.getTypeParameters()?.length ?? 0) > 0;

  if (!hasDeclarationTypeParams && !hasSignatureTypeParams) {
    return false;
  }

  // The callee has type parameters. Now check if the return type actually
  // references a type parameter. If the return type is concrete (e.g., `string`),
  // the generic doesn't cause the reference-equality FP and the assertion may
  // genuinely be unnecessary.
  // Only perform this check when we have both the explicit return type and type
  // parameter names from the declaration, since we need to match names syntactically.
  if (declaration?.typeParameters != null && declaration.type) {
    const typeParamNames = new Set(declaration.typeParameters.map(tp => tp.name.text));
    if (!typeNodeReferencesAny(declaration.type, typeParamNames)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether a type node references any of the given type parameter names.
 * This walks the type node AST to find TypeReference nodes that match.
 */
function typeNodeReferencesAny(typeNode: ts.TypeNode, names: Set<string>): boolean {
  if (ts.isTypeReferenceNode(typeNode)) {
    if (ts.isIdentifier(typeNode.typeName) && names.has(typeNode.typeName.text)) {
      return true;
    }
    // Check type arguments (e.g., Promise<T>)
    if (typeNode.typeArguments) {
      return typeNode.typeArguments.some(arg => typeNodeReferencesAny(arg, names));
    }
    return false;
  }
  if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
    return typeNode.types.some(t => typeNodeReferencesAny(t, names));
  }
  if (ts.isArrayTypeNode(typeNode)) {
    return typeNodeReferencesAny(typeNode.elementType, names);
  }
  if (ts.isTupleTypeNode(typeNode)) {
    return typeNode.elements.some(e => typeNodeReferencesAny(e, names));
  }
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return typeNodeReferencesAny(typeNode.type, names);
  }
  if (ts.isTypeOperatorNode(typeNode)) {
    return typeNodeReferencesAny(typeNode.type, names);
  }
  if (ts.isConditionalTypeNode(typeNode)) {
    return (
      typeNodeReferencesAny(typeNode.checkType, names) ||
      typeNodeReferencesAny(typeNode.extendsType, names) ||
      typeNodeReferencesAny(typeNode.trueType, names) ||
      typeNodeReferencesAny(typeNode.falseType, names)
    );
  }
  if (ts.isMappedTypeNode(typeNode) && typeNode.type) {
    return typeNodeReferencesAny(typeNode.type, names);
  }
  if (ts.isIndexedAccessTypeNode(typeNode)) {
    return (
      typeNodeReferencesAny(typeNode.objectType, names) ||
      typeNodeReferencesAny(typeNode.indexType, names)
    );
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
 */
function shouldSuppressNonNullAssertion(
  node: TSESTree.TSNonNullExpression,
  services: RequiredParserServices,
): boolean {
  const expression = node.expression as estree.Node;
  const checker = services.program.getTypeChecker();
  const tsNode = services.esTreeNodeToTSNodeMap.get(expression as TSESTree.Node);

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
