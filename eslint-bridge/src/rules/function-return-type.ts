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
import { getTypeAsString, toEncodedMessage } from './utils';

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
          context.report({
            message: toEncodedMessage(
              'Refactor this function to always return the same type.',
              returnStatements,
              returnStatements.map(
                retStmt => `Returns ${getTypeAsString(retStmt.argument!, services)}`,
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

function isUnion(type: ts.Type, checker: ts.TypeChecker) {
  const stringify = (tp: ts.Type) =>
    isObject(tp) ? 'object' : checker.typeToString(checker.getBaseTypeOfLiteralType(tp));
  const distinct = (value: string, index: number, self: string[]) => self.indexOf(value) === index;
  return type.isUnion() && type.types.map(stringify).filter(distinct).length > 1;
}

function isObject(type: ts.Type) {
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.ObjectLiteral) !== 0;
}

function hasReturnTypeJSDoc(signature: ts.Signature) {
  return signature.getJsDocTags().some(tag => ['return', 'returns'].includes(tag.name));
}
