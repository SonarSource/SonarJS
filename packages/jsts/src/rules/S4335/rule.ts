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
// https://sonarsource.github.io/rspec/#/rspec/S4335/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getNodeParent,
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/index.js';
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
    if (!isRequiredParserServices(services)) {
      return {};
    }

    function checkIntersectionType(node: estree.Node) {
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
        return;
      }
      checkTypesWithoutMembers(intersection, services);
    }

    function checkTypesWithoutMembers(
      intersection: TSESTree.TSIntersectionType,
      parserServices: RequiredParserServices,
    ) {
      for (const typeNode of intersection.types) {
        const tp: ts.Type = parserServices.program
          .getTypeChecker()
          .getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(typeNode));
        if (!isTypeWithoutMembers(tp)) {
          continue;
        }
        if (isLiteralUnionPattern(intersection)) {
          continue;
        }
        if (isGenericTypePattern(intersection, typeNode)) {
          continue;
        }
        context.report({
          messageId: 'removeIntersection',
          node: typeNode as unknown as estree.Node,
        });
      }
    }

    return {
      TSIntersectionType: checkIntersectionType,
    };
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

/**
 * Detects the LiteralUnion pattern: `(X & {})` used within a union type to preserve
 * IDE autocomplete for literal types while accepting any primitive value.
 * Example: `'small' | 'medium' | 'large' | (string & {})`
 */
function isLiteralUnionPattern(intersection: TSESTree.TSIntersectionType): boolean {
  if (intersection.types.length !== 2) {
    return false;
  }

  const parent = getNodeParent(intersection as unknown as estree.Node);
  if (!parent || (parent as TSESTree.Node).type !== 'TSUnionType') {
    return false;
  }

  const otherType = intersection.types.find(
    t => t.type !== 'TSTypeLiteral' || (t.members && t.members.length > 0),
  );

  if (!otherType) {
    return false;
  }

  return (
    otherType.type === 'TSStringKeyword' ||
    otherType.type === 'TSNumberKeyword' ||
    otherType.type === 'TSTypeReference'
  );
}

/**
 * Detects generic type patterns where `& {}` serves legitimate purposes:
 * 1. Simplify/Prettify pattern: `{ [K in keyof T]: T[K] } & {}` - forces type flattening
 * 2. Generic type reference with type arguments: `SomeType<T> & {}` - type normalization
 *
 * In these contexts, {} (non-nullish) intersection has semantic effects beyond members.
 */
function isGenericTypePattern(
  intersection: TSESTree.TSIntersectionType,
  emptyTypeNode: TSESTree.TypeNode,
): boolean {
  // Find the sibling type(s) that are not the empty type
  const siblingTypes = intersection.types.filter(t => t !== emptyTypeNode);

  for (const sibling of siblingTypes) {
    // Pattern 1: Mapped type - { [K in keyof T]: T[K] } & {}
    if (sibling.type === 'TSMappedType') {
      return true;
    }

    // Pattern 2: Type reference with type arguments - SomeType<T> & {}
    if (sibling.type === 'TSTypeReference' && sibling.typeArguments) {
      return true;
    }
  }

  return false;
}
