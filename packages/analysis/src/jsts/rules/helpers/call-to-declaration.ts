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
import type { RequiredParserServices } from './parser-services.js';
import { getSignatureFromCallee, getSymbolAtLocation } from './type.js';

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
    isConstVariableDeclaration(declaration) &&
    declaration.initializer !== undefined &&
    ts.isFunctionLike(declaration.initializer)
  ) {
    return declaration.initializer;
  }
  if (
    ts.isPropertyAssignment(declaration) &&
    declaration.initializer !== undefined &&
    ts.isFunctionLike(declaration.initializer)
  ) {
    return declaration.initializer;
  }
  return undefined;
}

function isConstVariableDeclaration(declaration: ts.VariableDeclaration): boolean {
  return ts.isVariableDeclarationList(declaration.parent)
    ? (declaration.parent.flags & ts.NodeFlags.Const) !== 0
    : false;
}

function hasBody(
  declaration: ts.SignatureDeclaration | undefined,
): declaration is ts.SignatureDeclaration & ts.FunctionLikeDeclarationBase {
  return declaration !== undefined && isFunctionLikeDeclaration(declaration) && !!declaration.body;
}

export function isFunctionLikeDeclaration(
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
  call: estree.CallExpression,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  return normalizeToFunctionLikeDeclaration(getSignatureFromCallee(call, services)?.declaration);
}

/**
 * Resolves an identifier reference to the directly referenced function-like declaration.
 *
 * Only one indirection is followed: a direct function declaration or a variable whose initializer
 * is a function expression / arrow function. Aliases such as `const cb = setup; describe(..., cb)`
 * intentionally return `undefined`.
 */
export function followReferenceToDeclaration(
  node: estree.Identifier,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  let symbol = getSymbolAtLocation(node, services);
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

function followMemberPropertyToDeclaration(
  call: estree.CallExpression,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  if (
    call.callee.type !== 'MemberExpression' ||
    call.callee.computed ||
    call.callee.property.type !== 'Identifier'
  ) {
    return undefined;
  }
  return (
    followObjectLiteralMemberToDeclaration(
      call.callee.object,
      call.callee.property.name,
      services,
    ) ?? followReferenceToDeclaration(call.callee.property, services)
  );
}

function followObjectLiteralMemberToDeclaration(
  object: estree.Expression | estree.Super,
  propertyName: string,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  if (object.type !== 'Identifier') {
    return undefined;
  }
  let symbol = getSymbolAtLocation(object, services);
  if (symbol === undefined) {
    return undefined;
  }
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    symbol = services.program.getTypeChecker().getAliasedSymbol(symbol);
  }
  if (symbol.declarations?.length !== 1) {
    return undefined;
  }
  const declaration = symbol.declarations[0];
  if (
    !ts.isVariableDeclaration(declaration) ||
    !isConstVariableDeclaration(declaration) ||
    declaration.initializer === undefined ||
    !ts.isObjectLiteralExpression(declaration.initializer)
  ) {
    return undefined;
  }
  return normalizeToFunctionLikeDeclaration(
    declaration.initializer.properties.find(property => property.name?.getText() === propertyName),
  );
}

function getAliasedSymbol(symbol: ts.Symbol | undefined, checker: ts.TypeChecker) {
  if (symbol === undefined) {
    return undefined;
  }
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    return checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function followTypeScriptReferenceToDeclaration(
  node: ts.Node,
  checker: ts.TypeChecker,
): ts.SignatureDeclaration | undefined {
  const symbol = getAliasedSymbol(checker.getSymbolAtLocation(node), checker);
  if (symbol?.declarations?.length !== 1) {
    return undefined;
  }
  return normalizeToFunctionLikeDeclaration(symbol.declarations[0]);
}

function followTypeScriptObjectLiteralMemberToDeclaration(
  expression: ts.Expression,
  propertyName: string,
  checker: ts.TypeChecker,
): ts.SignatureDeclaration | undefined {
  const symbol = getAliasedSymbol(checker.getSymbolAtLocation(expression), checker);
  if (symbol?.declarations?.length !== 1) {
    return undefined;
  }
  const declaration = symbol.declarations[0];
  if (
    !ts.isVariableDeclaration(declaration) ||
    !isConstVariableDeclaration(declaration) ||
    declaration.initializer === undefined ||
    !ts.isObjectLiteralExpression(declaration.initializer)
  ) {
    return undefined;
  }
  return normalizeToFunctionLikeDeclaration(
    declaration.initializer.properties.find(property => property.name?.getText() === propertyName),
  );
}

function followTypeScriptCalleeToDeclaration(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): ts.SignatureDeclaration | undefined {
  const { expression } = call;
  if (ts.isIdentifier(expression)) {
    return followTypeScriptReferenceToDeclaration(expression, checker);
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return (
      followTypeScriptObjectLiteralMemberToDeclaration(
        expression.expression,
        expression.name.text,
        checker,
      ) ?? followTypeScriptReferenceToDeclaration(expression.name, checker)
    );
  }
  return undefined;
}

/**
 * Resolves a call expression to executable code when possible. TypeScript may resolve a typed
 * function value call to its call signature rather than to the assigned implementation. In that
 * case, fallback to the callee's value declaration for direct identifiers and object members.
 */
export function followCallToImplementation(
  call: estree.CallExpression,
  services: RequiredParserServices,
): ts.SignatureDeclaration | undefined {
  const declaration = followCallToDeclaration(call, services);
  if (hasBody(declaration)) {
    return declaration;
  }
  if (call.callee.type === 'Identifier') {
    return followReferenceToDeclaration(call.callee, services) ?? declaration;
  }
  return followMemberPropertyToDeclaration(call, services) ?? declaration;
}

/**
 * Resolves a TypeScript call expression to executable code without requiring an ESTree mapping.
 * This is used while recursively visiting declarations from other files, where
 * `tsNodeToESTreeNodeMap` only covers the originally parsed file.
 */
export function followTypeScriptCallToImplementation(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): ts.SignatureDeclaration | undefined {
  const declaration = normalizeToFunctionLikeDeclaration(
    checker.getResolvedSignature(call)?.declaration,
  );
  if (hasBody(declaration)) {
    return declaration;
  }
  return followTypeScriptCalleeToDeclaration(call, checker) ?? declaration;
}
