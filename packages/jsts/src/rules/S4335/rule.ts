/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4335/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isRequiredParserServices } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
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
