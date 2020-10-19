/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://jira.sonarsource.com/browse/RSPEC-3800

import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule } from 'eslint';
import * as estree from 'estree';
import * as ts from 'typescript';
import { isRequiredParserServices } from '../utils/isRequiredParserServices';
import { getTypeFromTreeNode, toEncodedMessage } from './utils';

class FunctionScope {
  private readonly returnStatements: estree.ReturnStatement[] = [];

  getReturnStatements() {
    return this.returnStatements.slice();
  }

  addReturnStatement(node: estree.ReturnStatement) {
    this.returnStatements.push(node);
  }
}

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    let scopes: FunctionScope[] = [];

    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    return {
      ReturnStatement: (node: estree.Node) => {
        const retStmt = node as estree.ReturnStatement;
        if (scopes.length > 0 && retStmt.argument) {
          scopes[scopes.length - 1].addReturnStatement(retStmt);
        }
      },
      ':function': () => {
        scopes.push(new FunctionScope());
      },
      ':function:exit': (node: estree.Node) => {
        const returnStatements = scopes.pop()!.getReturnStatements();
        const signature = checker.getSignatureFromDeclaration(
          services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as ts.SignatureDeclaration,
        );
        if (signature && hasMultipleReturnTypes(signature, checker)) {
          const stmts = returnStatements.filter(
            retStmt => !isNullLike(getTypeFromTreeNode(retStmt.argument!, services)),
          );
          context.report({
            message: toEncodedMessage(
              'Refactor this function to always return the same type.',
              stmts,
              stmts.map(
                retStmt =>
                  `Returns ${prettyPrint(
                    getTypeFromTreeNode(retStmt.argument!, services),
                    checker,
                  )}`,
              ),
            ),
            node: node.type === 'FunctionDeclaration' && node.id ? node.id : node,
          });
        }
      },
      'Program:exit': () => {
        scopes = [];
      },
    };
  },
};

function hasMultipleReturnTypes(signature: ts.Signature, checker: ts.TypeChecker) {
  const returnType = checker.getBaseTypeOfLiteralType(checker.getReturnTypeOfSignature(signature));
  return isUnion(returnType, checker) && !hasReturnTypeJSDoc(signature);
}

function isUnion(type: ts.Type, checker: ts.TypeChecker): boolean {
  const distinct = (value: string, index: number, self: string[]) => self.indexOf(value) === index;
  const stringify = (tp: ts.Type) => prettyPrint(tp, checker);
  return type.isUnion() && type.types.map(stringify).filter(distinct).length > 1;
}

function hasReturnTypeJSDoc(signature: ts.Signature) {
  return signature.getJsDocTags().some(tag => ['return', 'returns'].includes(tag.name));
}

function prettyPrint(type: ts.Type, checker: ts.TypeChecker): string {
  const distinct = (value: string, index: number, self: string[]) => self.indexOf(value) === index;
  if (type.symbol && (type.symbol.flags & ts.SymbolFlags.ObjectLiteral) !== 0) {
    return 'object';
  }
  if (type.isUnionOrIntersection()) {
    const delimiter = type.isUnion() ? ' | ' : ' & ';
    return type.types
      .map(tp => prettyPrint(tp, checker))
      .filter(distinct)
      .join(delimiter);
  }
  const typeNode = checker.typeToTypeNode(type);
  if (typeNode !== undefined) {
    if (ts.isFunctionTypeNode(typeNode)) {
      return 'function';
    }
    if (ts.isArrayTypeNode(typeNode)) {
      return arrayTypeToString(typeNode, checker);
    }
  }
  return checker.typeToString(checker.getBaseTypeOfLiteralType(type));
}

function arrayTypeToString(type: ts.ArrayTypeNode, checker: ts.TypeChecker) {
  let elementType = prettyPrint(checker.getTypeFromTypeNode(type.elementType), checker);
  // TypeScript seems to fail resolving the element type of arrays. When this happens, we
  // manually resolve it for straightforward cases.
  if (elementType === 'any' && type.elementType.kind !== ts.SyntaxKind.AnyKeyword) {
    switch (type.elementType.kind) {
      case ts.SyntaxKind.NumberKeyword:
        elementType = 'number';
        break;
      case ts.SyntaxKind.StringKeyword:
        elementType = 'string';
        break;
      case ts.SyntaxKind.BooleanKeyword:
        elementType = 'boolean';
        break;
      case ts.SyntaxKind.TypeLiteral:
        elementType = 'object';
        break;
    }
  }
  return `${elementType}[]`;
}

function isNullLike(type: ts.Type) {
  return (
    (type.flags & ts.TypeFlags.Null) !== 0 ||
    (type.flags & ts.TypeFlags.Void) !== 0 ||
    (type.flags & ts.TypeFlags.Undefined) !== 0
  );
}
