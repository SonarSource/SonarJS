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
  while (node) {
    switch (node.kind) {
      case ts.SyntaxKind.CallExpression: {
        const callExpressionNode = node as ts.CallExpression;
        if (isRequireCall(callExpressionNode)) {
          node = callExpressionNode.arguments.at(0);
        } else {
          node = callExpressionNode.expression;
        }
        break;
      }
      case ts.SyntaxKind.FunctionDeclaration: {
        const functionDeclarationNode = node as ts.FunctionDeclaration;
        const name = functionDeclarationNode.name?.text;
        if (!name) {
          return null;
        }
        result.push(name);
        node = functionDeclarationNode.parent;
        break;
      }
      case ts.SyntaxKind.PropertyAccessExpression: {
        const propertyAccessExpression = node as ts.PropertyAccessExpression;
        const rhsFQN = propertyAccessExpression.name.text;
        if (!rhsFQN) {
          return null;
        }
        result.push(rhsFQN);
        node = propertyAccessExpression.expression;
        break;
      }
      case ts.SyntaxKind.ImportSpecifier: {
        const importSpecifier = node as ts.ImportSpecifier;
        const identifierName = importSpecifier.propertyName?.text ?? importSpecifier.name.text;
        if (!identifierName) {
          return null;
        }
        result.push(identifierName);
        node = importSpecifier.parent;
        break;
      }
      case ts.SyntaxKind.ImportDeclaration: {
        node = (node as ts.ImportDeclaration).moduleSpecifier;
        break;
      }
      case ts.SyntaxKind.SourceFile: {
        // Don't generate fqn for local files
        return null;
      }
      case ts.SyntaxKind.BindingElement: {
        const bindingElement = node as ts.BindingElement;
        let identifier;
        if (bindingElement.propertyName && 'text' in bindingElement.propertyName) {
          identifier = bindingElement.propertyName.text;
        } else if ('text' in bindingElement.name) {
          identifier = bindingElement.name.text;
        }
        if (!identifier) {
          return null;
        }
        result.push(identifier);
        node = node.parent;
        break;
      }
      case ts.SyntaxKind.VariableDeclaration: {
        const variableDeclaration = node as ts.VariableDeclaration;
        if (variableDeclaration.initializer) {
          node = variableDeclaration.initializer;
          break;
        } else {
          return null;
        }
      }
      case ts.SyntaxKind.Identifier: {
        const identifierSymbol = services.program.getTypeChecker().getSymbolAtLocation(node);
        if (isCompilerModule(identifierSymbol) || !identifierSymbol?.declarations?.length) {
          result.push((node as ts.Identifier).text);
          return returnResult();
        } else {
          node = identifierSymbol.declarations.at(0);
          break;
        }
      }
      case ts.SyntaxKind.StringLiteral: {
        result.push((node as ts.StringLiteral).text);
        return returnResult();
      }
      case ts.SyntaxKind.ImportClause: // Fallthrough
      case ts.SyntaxKind.ObjectBindingPattern: // Fallthrough
      case ts.SyntaxKind.Block: // Fallthrough
      case ts.SyntaxKind.ExpressionStatement: // Fallthrough
      case ts.SyntaxKind.NamedImports: // Fallthrough
      case ts.SyntaxKind.ModuleBlock: {
        node = node.parent;
        break;
      }
      default: {
        return null;
      }
    }
  }

  return null;

  function returnResult() {
    result.reverse();
    return removeNodePrefixIfExists(result.join('.'));
  }
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
