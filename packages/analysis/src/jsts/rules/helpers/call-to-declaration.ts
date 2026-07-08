/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type estree from 'estree';
import ts from 'typescript';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RequiredParserServices } from './parser-services.js';
import { getSignatureFromCallee, getSymbolAtLocation } from './type.js';

type SupportedCallExpression = estree.CallExpression | TSESTree.CallExpression;
type SupportedIdentifier = estree.Identifier | TSESTree.Identifier;

function normalizeToFunctionLikeDeclaration(
  declaration: ts.Declaration | undefined,
): ts.SignatureDeclaration | undefined {
  if (declaration === undefined) {
    return undefined;
  }
  if (ts.isFunctionLike(declaration)) {
    return declaration;
  }
  if (
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer !== undefined &&
    ts.isFunctionLike(declaration.initializer)
  ) {
    return declaration.initializer;
  }
  return undefined;
}

function hasBody(
  declaration: ts.SignatureDeclaration | undefined,
): declaration is ts.SignatureDeclaration & ts.FunctionLikeDeclarationBase {
  return declaration !== undefined && isFunctionLikeDeclaration(declaration) && !!declaration.body;
}

function isFunctionLikeDeclaration(
  declaration: ts.Declaration,
): declaration is ts.FunctionLikeDeclarationBase {
  return [
    ts.SyntaxKind.FunctionDeclaration,
    ts.SyntaxKind.FunctionExpression,
    ts.SyntaxKind.ArrowFunction,
    ts.SyntaxKind.MethodDeclaration,
    ts.SyntaxKind.Constructor,
    ts.SyntaxKind.GetAccessor,
    ts.SyntaxKind.SetAccessor,
  ].includes(declaration.kind);
}

/**
 * Resolves a call expression to the function-like declaration it targets, using the TypeScript
 * type checker's `getResolvedSignature`. Returns `undefined` when the callee does not resolve to
 * a known function declaration (e.g. built-ins, overloads with no single declaration, or
 * cross-package symbols without source).
 *
 * Only one hop is followed: the directly called function. Deeper call chains are not resolved.
 */
export function followCallToDeclaration(
  call: SupportedCallExpression,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  return normalizeToFunctionLikeDeclaration(
    getSignatureFromCallee(call as estree.CallExpression, services)?.declaration,
  );
}

/**
 * Resolves an identifier reference to the directly referenced function-like declaration.
 *
 * Only one indirection is followed: a direct function declaration or a variable whose initializer
 * is a function expression / arrow function. Aliases such as `const cb = setup; describe(..., cb)`
 * intentionally return `undefined`.
 */
export function followReferenceToDeclaration(
  node: SupportedIdentifier,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  let symbol = getSymbolAtLocation(node as estree.Identifier, services);
  if (symbol === undefined) {
    return undefined;
  }
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    symbol = services.program.getTypeChecker().getAliasedSymbol(symbol);
  }
  if (symbol.declarations?.length !== 1) {
    return undefined;
  }
  return normalizeToFunctionLikeDeclaration(symbol.declarations[0]);
}

/**
 * Resolves a call expression to executable code when possible. TypeScript may resolve a typed
 * function value call to its call signature rather than to the assigned implementation; in that
 * case, fallback to the callee identifier's value declaration.
 */
export function followCallToImplementation(
  call: SupportedCallExpression,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  const declaration = followCallToDeclaration(call, services);
  if (hasBody(declaration)) {
    return declaration;
  }
  if (call.callee.type === 'Identifier') {
    return followReferenceToDeclaration(call.callee, services) ?? declaration;
  }
  return declaration;
}
