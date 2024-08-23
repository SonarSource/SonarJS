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
// https://sonarsource.github.io/rspec/#/rspec/S4335/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import * as ts from 'typescript';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isRequiredParserServices } from '../helpers';
import { meta } from './meta';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeIntersection: 'Remove this type without members or change this type intersection.',
      simplifyIntersection: 'Simplify this intersection as it always has type "{{type}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        TSIntersectionType: (node: estree.Node) => {
          const intersection = node as unknown as TSESTree.TSIntersectionType;
          const anyOrNever = intersection.types.find(typeNode =>
            ['TSAnyKeyword', 'TSNeverKeyword'].includes(typeNode.type),
          );
          if (anyOrNever) {
            context.report({
              messageId: 'simplifyIntersection',
              data: {
                type: anyOrNever.type === 'TSAnyKeyword' ? 'any' : 'never',
              },
              node,
            });
          } else {
            intersection.types.forEach(typeNode => {
              const tp: ts.Type = services.program
                .getTypeChecker()
                .getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(typeNode));
              if (isTypeWithoutMembers(tp)) {
                context.report({
                  messageId: 'removeIntersection',
                  node: typeNode as unknown as estree.Node,
                });
              }
            });
          }
        },
      };
    }
    return {};
  },
};

function isTypeWithoutMembers(tp: ts.Type): boolean {
  return isNullLike(tp) || (isEmptyInterface(tp) && isStandaloneInterface(tp.symbol));
}

function isNullLike(tp: ts.Type): boolean {
  return (
    Boolean(tp.flags & ts.TypeFlags.Null) ||
    Boolean(tp.flags & ts.TypeFlags.Undefined) ||
    Boolean(tp.flags & ts.TypeFlags.Void)
  );
}

function isEmptyInterface(tp: ts.Type): boolean {
  return (
    tp.getProperties().length === 0 &&
    (!(tp as ts.InterfaceTypeWithDeclaredMembers).declaredIndexInfos ||
      (tp as ts.InterfaceTypeWithDeclaredMembers).declaredIndexInfos.length === 0)
  );
}

function isStandaloneInterface(typeSymbol: ts.Symbol) {
  // there is no declarations for `{}`
  // otherwise check that none of declarations has a heritage clause (`extends X` or `implements X`)
  if (!typeSymbol) {
    return false;
  }
  const { declarations } = typeSymbol;
  return (
    !declarations ||
    declarations.every(declaration => {
      return (
        isInterfaceDeclaration(declaration) && (declaration.heritageClauses ?? []).length === 0
      );
    })
  );
}

function isInterfaceDeclaration(
  declaration: ts.Declaration,
): declaration is ts.InterfaceDeclaration {
  return declaration.kind === ts.SyntaxKind.InterfaceDeclaration;
}
