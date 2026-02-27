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
// https://sonarsource.github.io/rspec/#/rspec/S3800/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import ts, { type UnionType } from 'typescript';
import {
  type RuleContext,
  generateMeta,
  getMainFunctionTokenLocation,
  getParent,
  getTypeFromTreeNode,
  isAny,
  isBooleanTrueType,
  isRequiredParserServices,
  isStringType,
  last,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

class FunctionScope {
  private readonly returnStatements: estree.ReturnStatement[] = [];

  getReturnStatements() {
    return this.returnStatements.slice();
  }

  addReturnStatement(node: estree.ReturnStatement) {
    this.returnStatements.push(node);
  }
}

const isASanitationFunction = (signature: ts.Signature) => {
  const { types } = signature.getReturnType() as UnionType;

  return types.length === 2 && types.some(isBooleanTrueType) && types.some(isStringType);
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    let scopes: FunctionScope[] = [];

    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    function onFunctionExit(node: estree.Node) {
      const returnStatements = scopes.pop()!.getReturnStatements();
      if (returnStatements.some(retStmt => retStmt.argument?.type === 'ThisExpression')) {
        return;
      }
      const signature = checker.getSignatureFromDeclaration(
        services.esTreeNodeToTSNodeMap.get(node as TSESTree.Node) as ts.SignatureDeclaration,
      );
      if (signature && hasMultipleReturnTypes(signature, checker)) {
        if (isASanitationFunction(signature)) {
          return;
        }

        const stmts = returnStatements.filter(
          retStmt => !isNullLike(getTypeFromTreeNode(retStmt.argument!, services)),
        );
        const stmtsTypes = stmts.map(retStmt => getTypeFromTreeNode(retStmt.argument!, services));
        if (stmtsTypes.every(isAny)) {
          return;
        }
        const stmtCategories = stmtsTypes.map(t => prettyPrint(t, checker));
        if (stmtCategories.filter((val, i, arr) => distinct(val, i, arr)).length <= 1) {
          return;
        }
        report(
          context,
          {
            message: 'Refactor this function to always return the same type.',
            loc: getMainFunctionTokenLocation(
              node as TSESTree.FunctionLike,
              getParent(context, node) as TSESTree.Node,
              context as unknown as RuleContext,
            ),
          },
          stmts.map((stmt, i) =>
            toSecondaryLocation(stmt, `Returns ${prettyPrint(stmtsTypes[i], checker)}`),
          ),
        );
      }
    }

    return {
      ReturnStatement: (node: estree.Node) => {
        const retStmt = node as estree.ReturnStatement;
        if (scopes.length > 0 && retStmt.argument) {
          last(scopes).addReturnStatement(retStmt);
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
      .filter((val, i, arr) => distinct(val, i, arr)).length > 1
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
      .filter((val, i, arr) => distinct(val, i, arr))
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
  const typeAsString = checker.typeToString(type);
  // Since TS 5.7 typed arrays include the type of the elements in the string, eg. Float32Array<any>
  return /.*Array(?:<[^>]*>)?$/.test(typeAsString);
}

function isNullLike(type: ts.Type) {
  return (
    (type.flags & ts.TypeFlags.Null) !== 0 ||
    (type.flags & ts.TypeFlags.Void) !== 0 ||
    (type.flags & ts.TypeFlags.Undefined) !== 0
  );
}
