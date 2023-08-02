/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3800/javascript

import { TSESTree } from '@typescript-eslint/experimental-utils';
import { Rule } from 'eslint';
import { getMainFunctionTokenLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';
import * as estree from 'estree';
import * as ts from 'typescript';
import {
  getParent,
  getTypeFromTreeNode,
  isAny,
  isRequiredParserServices,
  RuleContext,
  toEncodedMessage,
} from './helpers';
import { SONAR_RUNTIME } from '../linter/parameters';

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
        enum: [SONAR_RUNTIME],
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

    function onFunctionExit(node: estree.Node) {
      const returnStatements = scopes.pop()!.getReturnStatements();
      if (returnStatements.every(retStmt => retStmt.argument?.type === 'ThisExpression')) {
        return;
      }
      const signature = checker.getSignatureFromDeclaration(
        services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as ts.SignatureDeclaration,
      );
      if (signature && hasMultipleReturnTypes(signature, checker)) {
        const stmts = returnStatements.filter(
          retStmt => !isNullLike(getTypeFromTreeNode(retStmt.argument!, services)),
        );
        const stmtsTypes = stmts.map(retStmt => getTypeFromTreeNode(retStmt.argument!, services));
        if (stmtsTypes.every(isAny)) {
          return;
        }
        context.report({
          message: toEncodedMessage(
            'Refactor this function to always return the same type.',
            stmts,
            stmtsTypes.map(stmtType => `Returns ${prettyPrint(stmtType, checker)}`),
          ),
          loc: getMainFunctionTokenLocation(
            node as TSESTree.FunctionLike,
            getParent(context) as TSESTree.Node,
            context as unknown as RuleContext,
          ),
        });
      }
    }

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
      ':function:exit': onFunctionExit,
      'Program:exit': () => {
        scopes = [];
      },
    };
  },
};

function hasMultipleReturnTypes(signature: ts.Signature, checker: ts.TypeChecker) {
  const returnType = checker.getBaseTypeOfLiteralType(checker.getReturnTypeOfSignature(signature));
  return isMixingTypes(returnType, checker) && !hasReturnTypeJSDoc(signature);
}

function isMixingTypes(type: ts.Type, checker: ts.TypeChecker): boolean {
  return (
    type.isUnion() &&
    type.types
      .filter(tp => !isNullLike(tp))
      .map(tp => prettyPrint(tp, checker))
      .filter(distinct).length > 1
  );
}

function hasReturnTypeJSDoc(signature: ts.Signature) {
  return signature.getJsDocTags().some(tag => ['return', 'returns'].includes(tag.name));
}

function isObjectLikeType(type: ts.Type) {
  return !!(type.getFlags() & ts.TypeFlags.Object);
}

function distinct<T>(value: T, index: number, self: T[]) {
  return self.indexOf(value) === index;
}

function prettyPrint(type: ts.Type, checker: ts.TypeChecker): string {
  if (type.isUnionOrIntersection()) {
    const delimiter = type.isUnion() ? ' | ' : ' & ';
    return type.types
      .map(tp => prettyPrint(tp, checker))
      .filter(distinct)
      .join(delimiter);
  }
  const typeNode = checker.typeToTypeNode(type, undefined, undefined);
  if (typeNode !== undefined) {
    if (ts.isFunctionTypeNode(typeNode)) {
      return 'function';
    }
    if (ts.isArrayTypeNode(typeNode) || isTypedArray(type, checker)) {
      return 'array';
    }
  }
  if (isObjectLikeType(type)) {
    return 'object';
  }
  return checker.typeToString(checker.getBaseTypeOfLiteralType(type));
}

function isTypedArray(type: ts.Type, checker: ts.TypeChecker) {
  return checker.typeToString(type).endsWith('Array');
}

function isNullLike(type: ts.Type) {
  return (
    (type.flags & ts.TypeFlags.Null) !== 0 ||
    (type.flags & ts.TypeFlags.Void) !== 0 ||
    (type.flags & ts.TypeFlags.Undefined) !== 0
  );
}
