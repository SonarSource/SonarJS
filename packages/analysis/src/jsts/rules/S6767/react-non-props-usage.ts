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
import {
  getReportedEnclosingType,
  type ReportedEnclosingType,
  type TypeDeclarationNode,
} from '../helpers/reported-type.js';
import {
  getComponentPropsTypeCandidates,
  getDeclaredClassNonPropsTypes,
  isClassComponentNode,
  isFunctionComponentNode,
  isPascalCaseFunctionComponent,
} from '../helpers/react.js';
import { areSameTypeDeclarations } from '../helpers/type.js';

type ReactNonPropsTypeUsage = 'mixed' | 'non-props' | 'other' | 'props';
type SourceCache = {
  reactNonPropsTypeDeclByComponent: WeakMap<
    TypeDeclarationNode,
    WeakMap<estree.Node, ReactNonPropsTypeUsage>
  >;
};

const perSourceCache = new WeakMap<SourceCode, SourceCache>();

/**
 * Returns true when the reported type declaration is only used as a React class
 * non-props generic (state or snapshot), so an upstream "unused prop type"
 * report should be suppressed.
 */
export function isUsedAsReactComponentNonPropsType(
  node: estree.Node,
  componentNode: estree.Node,
  context: Rule.RuleContext,
): boolean {
  const ancestors = context.sourceCode.getAncestors(node);
  return isReactComponentNonPropsTypeDeclaration(componentNode, ancestors, context);
}

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      reactNonPropsTypeDeclByComponent: new WeakMap<
        TypeDeclarationNode,
        WeakMap<estree.Node, ReactNonPropsTypeUsage>
      >(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

function isReactComponentNonPropsTypeDeclaration(
  componentNode: estree.Node,
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

  const usage = getReactNonPropsTypeUsage(
    componentNode,
    reportedEnclosingType,
    services,
    checker,
    getSourceCache(context.sourceCode),
  );
  return usage === 'non-props';
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

function getReactNonPropsTypeUsage(
  componentNode: estree.Node,
  reportedEnclosingType: ReportedEnclosingType,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  sourceCache: SourceCache,
): ReactNonPropsTypeUsage {
  let usagesByComponent = sourceCache.reactNonPropsTypeDeclByComponent.get(
    reportedEnclosingType.declaration,
  );
  if (!usagesByComponent) {
    usagesByComponent = new WeakMap<estree.Node, ReactNonPropsTypeUsage>();
    sourceCache.reactNonPropsTypeDeclByComponent.set(
      reportedEnclosingType.declaration,
      usagesByComponent,
    );
  }

  const cached = usagesByComponent.get(componentNode);
  if (cached !== undefined) {
    return cached;
  }

  const isPropsType = usesReportedTypeAsComponentProps(
    componentNode,
    services,
    checker,
    reportedEnclosingType,
  );
  const isNonPropsType = usesReportedTypeAsReactClassNonProps(
    componentNode,
    services,
    checker,
    reportedEnclosingType,
  );

  let usage: ReactNonPropsTypeUsage = 'other';
  if (isNonPropsType) {
    usage = isPropsType ? 'mixed' : 'non-props';
  } else if (isPropsType) {
    usage = 'props';
  }

  usagesByComponent.set(componentNode, usage);
  return usage;
}
