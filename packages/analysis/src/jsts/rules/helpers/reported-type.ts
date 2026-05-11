/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import type { TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';
import type { RequiredParserServices } from './parser-services.js';
import { areSameTypeDeclarations } from './type.js';

/**
 * Stores both ESTree and TypeScript views of a reported type-related construct.
 *
 * React helpers use it for both reported enclosing types and reported type members.
 * When the instance represents an enclosing type, the predicate methods below answer
 * whether another TypeScript type still refers back to it.
 */
export class ReportedTypeDetails<TDeclaration extends TSESTree.Node, TTsNode extends ts.Node> {
  constructor(
    readonly name: string,
    readonly declaration: TDeclaration,
    readonly tsNode: TTsNode,
    readonly tsType: ts.Type,
    readonly tsTypeSymbol: ts.Symbol | undefined,
  ) {}

  /**
   * Builds a reported type wrapper when the ESTree declaration maps to the expected
   * TypeScript declaration kind.
   */
  static fromDeclaration<TDeclaration extends TSESTree.Node, TTsNode extends ts.Node>(
    declaration: TDeclaration | undefined,
    name: string | undefined,
    services: RequiredParserServices,
    checker: ts.TypeChecker,
    isTsNode: (node: ts.Node) => node is TTsNode,
  ): ReportedTypeDetails<TDeclaration, TTsNode> | undefined {
    if (!declaration || !name) {
      return undefined;
    }

    const tsNode = services.esTreeNodeToTSNodeMap.get(declaration);
    if (!isTsNode(tsNode)) {
      return undefined;
    }

    const tsType = checker.getTypeAtLocation(tsNode);
    return new ReportedTypeDetails<TDeclaration, TTsNode>(
      name,
      declaration,
      tsNode,
      tsType,
      tsType.aliasSymbol ?? tsType.symbol,
    );
  }

  /**
   * Returns true when `type` uses this reported type declaration, directly or
   * through another type.
   *
   * Example:
   * ```ts
   * interface SharedProps {
   *   sharedValue: string;
   * }
   *
   * interface ChildProps extends SharedProps {
   *   title: string;
   * }
   *
   * type WrappedProps = ChildProps & {
   *   compact: boolean;
   * };
   * ```
   *
   * `ChildProps` and `WrappedProps` both use the reported type declaration `SharedProps`.
   */
  isUsedByType(type: ts.Type, checker: ts.TypeChecker, seen = new Set<ts.Symbol>()): boolean {
    if (!this.tsTypeSymbol) {
      return false;
    }

    if (areSameTypeDeclarations(checker, type, this.tsType)) {
      return true;
    }

    const typeSymbol = type.aliasSymbol ?? type.symbol;
    if (!typeSymbol || seen.has(typeSymbol)) {
      return false;
    }

    // The type is actually the reported type in terms of symbols.
    if (typeSymbol === this.tsTypeSymbol) {
      return true;
    }

    seen.add(typeSymbol);
    return (
      typeSymbol.declarations !== undefined &&
      typeSymbol.declarations.some(declaration =>
        this.isUsedByDeclaration(declaration, checker, seen),
      )
    );
  }

  /**
   * Returns true when `declaration` uses this reported type through `extends`,
   * intersections, unions, or nested references.
   */
  private isUsedByDeclaration(
    declaration: ts.Declaration,
    checker: ts.TypeChecker,
    seen: Set<ts.Symbol>,
  ): boolean {
    if (ts.isInterfaceDeclaration(declaration)) {
      return (
        declaration.heritageClauses?.some(clause =>
          clause.types.some(type =>
            this.isUsedByType(checker.getTypeAtLocation(type), checker, seen),
          ),
        ) === true
      );
    }

    if (ts.isTypeAliasDeclaration(declaration)) {
      return this.isUsedByTypeNode(declaration.type, checker, seen);
    }

    return false;
  }

  /**
   * Returns true when `typeNode` references this reported type declaration.
   *
   * It unwraps parentheses, intersections, unions, and type references until it can
   * tell whether that declaration is used.
   */
  private isUsedByTypeNode(
    typeNode: ts.TypeNode,
    checker: ts.TypeChecker,
    seen: Set<ts.Symbol>,
  ): boolean {
    if (ts.isParenthesizedTypeNode(typeNode)) {
      return this.isUsedByTypeNode(typeNode.type, checker, seen);
    }

    if (ts.isIntersectionTypeNode(typeNode) || ts.isUnionTypeNode(typeNode)) {
      return typeNode.types.some(type => this.isUsedByTypeNode(type, checker, seen));
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      return this.isUsedByType(checker.getTypeAtLocation(typeNode), checker, seen);
    }

    return false;
  }
}
