/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4123/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import * as ts from 'typescript';
import { isRequiredParserServices, getTypeFromTreeNode, getSignatureFromCallee } from '../helpers';
import { ParserServicesWithTypeInformation, TSESTree } from '@typescript-eslint/utils';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      refactorAwait: "Refactor this redundant 'await' on a non-promise.",
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        AwaitExpression: (node: estree.AwaitExpression) => {
          const awaitedType = getTypeFromTreeNode(
            (node as estree.AwaitExpression).argument,
            services,
          );
          if (
            !isException(node, services) &&
            !isThenable(awaitedType) &&
            !isAny(awaitedType) &&
            !isUnknown(awaitedType) &&
            !isUnion(awaitedType)
          ) {
            context.report({
              messageId: 'refactorAwait',
              node,
            });
          }
        },
      };
    }
    return {};
  },
};

/**
 * If the awaited expression is a call expression, check if it is a call to a function with JSDoc.
 */
function isException(node: estree.AwaitExpression, services: ParserServicesWithTypeInformation) {
  if (node.argument.type !== 'CallExpression') {
    return false;
  }
  const signature = getSignatureFromCallee(node.argument, services);
  return signature?.declaration && hasJsDoc(signature.declaration);

  function hasJsDoc(declaration: ts.Declaration & { jsDoc?: ts.JSDoc[] }) {
    return declaration.jsDoc && declaration.jsDoc.length > 0;
  }
}

function isThenable(type: ts.Type) {
  const thenProperty = type.getProperty('then');
  return thenProperty?.declarations?.some(
    d =>
      d.kind === ts.SyntaxKind.MethodSignature ||
      d.kind === ts.SyntaxKind.MethodDeclaration ||
      d.kind === ts.SyntaxKind.PropertyDeclaration,
  );
}

function isAny(type: ts.Type) {
  return Boolean(type.flags & ts.TypeFlags.Any);
}

function isUnknown(type: ts.Type) {
  return Boolean(type.flags & ts.TypeFlags.Unknown);
}

function isUnion(type: ts.Type) {
  return Boolean(type.flags & ts.TypeFlags.Union);
}
