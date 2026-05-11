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
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import {
  isRequiredParserServices,
  type RequiredParserServices,
} from '../helpers/parser-services.js';
import { ReportedTypeDetails } from '../helpers/reported-type.js';
import {
  getComponentPropsTypeCandidates,
  getDeclaredClassNonPropsTypes,
  getReactComponentNodes,
  isClassComponentNode,
  isFunctionComponentNode,
  isPascalCaseFunctionComponent,
} from '../helpers/react.js';
import { areSameTypeDeclarations } from '../helpers/type.js';

type TypeDeclarationNode = TSESTree.TSInterfaceDeclaration | TSESTree.TSTypeAliasDeclaration;
type ReportedEnclosingType = ReportedTypeDetails<
  TypeDeclarationNode,
  ts.InterfaceDeclaration | ts.TypeAliasDeclaration
>;
type ReactNonPropsTypeUsage = 'mixed' | 'non-props' | 'other';
type SourceCache = {
  reactNonPropsTypeDecl: WeakMap<TypeDeclarationNode, ReactNonPropsTypeUsage>;
  mixedReactNonPropsReportNodes: WeakMap<TypeDeclarationNode, WeakSet<estree.Node>>;
};

const perSourceCache = new WeakMap<SourceCode, SourceCache>();

/**
 * Returns true when the reported type declaration is only used as a React class
 * non-props generic (state or snapshot), so an upstream "unused prop type"
 * report should be suppressed.
 */
export function isUsedAsReactComponentNonPropsType(
  node: estree.Node,
  context: Rule.RuleContext,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  return isReactComponentNonPropsTypeDeclaration(node, ancestors, context);
}

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      reactNonPropsTypeDecl: new WeakMap<TypeDeclarationNode, ReactNonPropsTypeUsage>(),
      mixedReactNonPropsReportNodes: new WeakMap<TypeDeclarationNode, WeakSet<estree.Node>>(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

function isReactComponentNonPropsTypeDeclaration(
  node: estree.Node,
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): boolean {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return false;
  }

  // Step 1: resolve the enclosing reported type declaration for the node that
  // upstream is about to report as an unused prop member.
  const checker = services.program.getTypeChecker();
  const reportedEnclosingType = getReportedEnclosingType(ancestors, services, checker);
  if (!reportedEnclosingType) {
    return false;
  }

  // Step 2: reuse the per-declaration classification when this type has already
  // been seen for another reported member in the same file.
  const sourceCache = getSourceCache(context.sourceCode);
  const cached = sourceCache.reactNonPropsTypeDecl.get(reportedEnclosingType.declaration);
  if (cached !== undefined) {
    return shouldSuppressReactNonPropsReport(
      node,
      reportedEnclosingType.declaration,
      cached,
      sourceCache,
    );
  }

  // Step 3: reuse the shared React component scan, then ask whether the
  // reported type appears anywhere as a real props contract.
  const componentNodes = getReactComponentNodes(context);
  const isPropsTypeSomewhere = componentNodes.some(componentNode =>
    usesReportedTypeAsComponentProps(componentNode, services, checker, reportedEnclosingType),
  );

  // Step 4: independently ask whether the same reported type is used as a React
  // class non-props generic, i.e. state or snapshot.
  const isNonPropsType = componentNodes.some(componentNode =>
    usesReportedTypeAsReactClassNonProps(componentNode, services, checker, reportedEnclosingType),
  );

  // Step 5: classify the declaration once, cache that result, and let the
  // mixed/non-props suppression helper decide whether this particular report
  // should be dropped.
  let usage: ReactNonPropsTypeUsage = 'other';
  if (isNonPropsType) {
    usage = isPropsTypeSomewhere ? 'mixed' : 'non-props';
  }
  sourceCache.reactNonPropsTypeDecl.set(reportedEnclosingType.declaration, usage);
  return shouldSuppressReactNonPropsReport(
    node,
    reportedEnclosingType.declaration,
    usage,
    sourceCache,
  );
}

function usesReportedTypeAsComponentProps(
  componentNode: estree.Node,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedEnclosingType: ReportedEnclosingType,
): boolean {
  if (isFunctionComponentNode(componentNode) && !isPascalCaseFunctionComponent(componentNode)) {
    return false;
  }

  return getComponentPropsTypeCandidates(componentNode, services).some(propsType =>
    areSameTypeDeclarations(checker, reportedEnclosingType.tsType, propsType),
  );
}

function usesReportedTypeAsReactClassNonProps(
  componentNode: estree.Node,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedEnclosingType: ReportedEnclosingType,
): boolean {
  if (!isClassComponentNode(componentNode)) {
    return false;
  }

  const tsNode = services.esTreeNodeToTSNodeMap.get(
    componentNode as TSESTree.Node,
  ) as ts.ClassLikeDeclaration;
  return getDeclaredClassNonPropsTypes(tsNode, checker).some(nonPropsType =>
    areSameTypeDeclarations(checker, reportedEnclosingType.tsType, nonPropsType),
  );
}

function shouldSuppressReactNonPropsReport(
  node: estree.Node,
  reportedEnclosingTypeDeclaration: TypeDeclarationNode,
  usage: ReactNonPropsTypeUsage,
  sourceCache: SourceCache,
): boolean {
  if (usage === 'non-props') {
    return true;
  }
  if (usage !== 'mixed') {
    return false;
  }

  let reportedNodes = sourceCache.mixedReactNonPropsReportNodes.get(
    reportedEnclosingTypeDeclaration,
  );
  if (!reportedNodes) {
    reportedNodes = new WeakSet<estree.Node>();
    sourceCache.mixedReactNonPropsReportNodes.set(reportedEnclosingTypeDeclaration, reportedNodes);
  }

  // `mixed` means the same declaration is reused both as real props and as a
  // class non-props generic (state/snapshot). We cannot always suppress it,
  // because that would hide legitimate props-side reports; we also cannot
  // always keep it, because the upstream rule can then emit the same issue
  // again from the non-props owner. Keep the first report for a given node and
  // suppress later duplicates. This relies on ESLint reporting components in
  // source order, so the props-owning component — which should appear before
  // state-owning ones in conventional file layouts — wins.
  const shouldSuppress = reportedNodes.has(node);
  reportedNodes.add(node);
  return shouldSuppress;
}

function findEnclosingTypeDeclaration(ancestors: estree.Node[]): TypeDeclarationNode | undefined {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i] as TSESTree.Node;
    if (isTypeDeclarationNode(ancestor)) {
      return ancestor;
    }
  }
  return undefined;
}

function getTypeDeclarationName(
  typeDeclaration: TypeDeclarationNode | undefined,
): string | undefined {
  return typeDeclaration?.id.name;
}

function isTypeDeclarationTsNode(
  node: ts.Node,
): node is ts.InterfaceDeclaration | ts.TypeAliasDeclaration {
  return ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node);
}

function getReportedEnclosingType(
  ancestors: estree.Node[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
): ReportedEnclosingType | undefined {
  const declaration = findEnclosingTypeDeclaration(ancestors);
  return ReportedTypeDetails.fromDeclaration(
    declaration,
    getTypeDeclarationName(declaration),
    services,
    checker,
    isTypeDeclarationTsNode,
  );
}

function isTypeDeclarationNode(node: TSESTree.Node): node is TypeDeclarationNode {
  return node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration';
}
