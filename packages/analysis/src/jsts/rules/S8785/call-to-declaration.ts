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
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import type { RequiredParserServices } from '../helpers/parser-services.js';
import { getSignatureFromCallee } from '../helpers/type.js';

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
  const tsNode = services.esTreeNodeToTSNodeMap.get(node as unknown as TSESTree.Node);
  const checker = services.program.getTypeChecker();
  let symbol = checker.getSymbolAtLocation(tsNode);
  if (symbol === undefined) {
    return undefined;
  }
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  if (symbol.declarations?.length !== 1) {
    return undefined;
  }
  return normalizeToFunctionLikeDeclaration(symbol.declarations[0]);
}
