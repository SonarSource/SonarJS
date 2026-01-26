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
import ts from 'typescript';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import { removeNodePrefixIfExists } from './module.js';

export function getFullyQualifiedNameTS(
  services: ParserServicesWithTypeInformation,
  rootNode: ts.Node,
): string | null {
  const result: string[] = [];
  let node: ts.Node | undefined = rootNode;

  const returnResult = () => {
    result.reverse();
    return removeNodePrefixIfExists(result.join('.'));
  };

  while (node) {
    const handled = handleNode(node, result, services, returnResult);
    if (handled.shouldReturn) {
      return handled.result;
    }
    node = handled.nextNode;
  }

  return null;
}

type NodeHandleResult = {
  shouldReturn: boolean;
  result: string | null;
  nextNode: ts.Node | undefined;
};

function handleNode(
  node: ts.Node,
  result: string[],
  services: ParserServicesWithTypeInformation,
  returnResult: () => string | null,
): NodeHandleResult {
  switch (node.kind) {
    case ts.SyntaxKind.CallExpression:
      return handleCallExpression(node as ts.CallExpression);
    case ts.SyntaxKind.FunctionDeclaration:
      return handleFunctionDeclaration(node as ts.FunctionDeclaration, result);
    case ts.SyntaxKind.PropertyAccessExpression:
      return handlePropertyAccessExpression(node as ts.PropertyAccessExpression, result);
    case ts.SyntaxKind.ImportSpecifier:
      return handleImportSpecifier(node as ts.ImportSpecifier, result);
    case ts.SyntaxKind.ImportDeclaration:
      return {
        shouldReturn: false,
        result: null,
        nextNode: (node as ts.ImportDeclaration).moduleSpecifier,
      };
    case ts.SyntaxKind.SourceFile:
      // Don't generate fqn for local files
      return { shouldReturn: true, result: null, nextNode: undefined };
    case ts.SyntaxKind.BindingElement:
      return handleBindingElement(node as ts.BindingElement, result);
    case ts.SyntaxKind.VariableDeclaration:
      return handleVariableDeclaration(node as ts.VariableDeclaration);
    case ts.SyntaxKind.Identifier:
      return handleIdentifier(node as ts.Identifier, result, services, returnResult);
    case ts.SyntaxKind.StringLiteral:
      result.push((node as ts.StringLiteral).text);
      return { shouldReturn: true, result: returnResult(), nextNode: undefined };
    case ts.SyntaxKind.ImportClause:
    case ts.SyntaxKind.ObjectBindingPattern:
    case ts.SyntaxKind.Block:
    case ts.SyntaxKind.ExpressionStatement:
    case ts.SyntaxKind.NamedImports:
    case ts.SyntaxKind.ModuleBlock:
      return { shouldReturn: false, result: null, nextNode: node.parent };
    default:
      return { shouldReturn: true, result: null, nextNode: undefined };
  }
}

function handleCallExpression(node: ts.CallExpression): NodeHandleResult {
  if (isRequireCall(node)) {
    return { shouldReturn: false, result: null, nextNode: node.arguments.at(0) };
  }
  return { shouldReturn: false, result: null, nextNode: node.expression };
}

function handleFunctionDeclaration(
  node: ts.FunctionDeclaration,
  result: string[],
): NodeHandleResult {
  const name = node.name?.text;
  if (!name) {
    return { shouldReturn: true, result: null, nextNode: undefined };
  }
  result.push(name);
  return { shouldReturn: false, result: null, nextNode: node.parent };
}

function handlePropertyAccessExpression(
  node: ts.PropertyAccessExpression,
  result: string[],
): NodeHandleResult {
  const rhsFQN = node.name.text;
  if (!rhsFQN) {
    return { shouldReturn: true, result: null, nextNode: undefined };
  }
  result.push(rhsFQN);
  return { shouldReturn: false, result: null, nextNode: node.expression };
}

function handleImportSpecifier(node: ts.ImportSpecifier, result: string[]): NodeHandleResult {
  const identifierName = node.propertyName?.text ?? node.name.text;
  if (!identifierName) {
    return { shouldReturn: true, result: null, nextNode: undefined };
  }
  result.push(identifierName);
  return { shouldReturn: false, result: null, nextNode: node.parent };
}

function handleBindingElement(node: ts.BindingElement, result: string[]): NodeHandleResult {
  let identifier;
  if (node.propertyName && 'text' in node.propertyName) {
    identifier = node.propertyName.text;
  } else if ('text' in node.name) {
    identifier = node.name.text;
  }
  if (!identifier) {
    return { shouldReturn: true, result: null, nextNode: undefined };
  }
  result.push(identifier);
  return { shouldReturn: false, result: null, nextNode: node.parent };
}

function handleVariableDeclaration(node: ts.VariableDeclaration): NodeHandleResult {
  if (node.initializer) {
    return { shouldReturn: false, result: null, nextNode: node.initializer };
  }
  return { shouldReturn: true, result: null, nextNode: undefined };
}

function handleIdentifier(
  node: ts.Identifier,
  result: string[],
  services: ParserServicesWithTypeInformation,
  returnResult: () => string | null,
): NodeHandleResult {
  const identifierSymbol = services.program.getTypeChecker().getSymbolAtLocation(node);
  const declaration = identifierSymbol?.declarations?.at(0);
  // Handle: no symbol info, compiler module, or self-referential declaration (e.g., `module` in CommonJS)
  if (isCompilerModule(identifierSymbol) || !declaration || declaration === node) {
    result.push(node.text);
    return { shouldReturn: true, result: returnResult(), nextNode: undefined };
  }
  return { shouldReturn: false, result: null, nextNode: declaration };
}

function isRequireCall(callExpression: ts.CallExpression) {
  return (
    callExpression.expression.kind === ts.SyntaxKind.Identifier &&
    (callExpression.expression as ts.Identifier).text === 'require' &&
    callExpression.arguments.length === 1
  );
}

function isCompilerModule(node: ts.Symbol | undefined) {
  return (
    node &&
    (node.flags & ts.SymbolFlags.Module) !== 0 &&
    (node.flags & ts.SymbolFlags.Assignment) !== 0
  );
}
