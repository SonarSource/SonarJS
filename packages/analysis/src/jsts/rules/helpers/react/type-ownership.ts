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
import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import ts from 'typescript';
import {
  collectComponents,
  createComponentAnalysis,
  type CollectedComponent,
  type ComponentAnalysis,
} from './component-analysis.js';
import { getReportedTypeFromAncestors, type ReportedType } from '../reported-type.js';
import {
  componentPropsIncludeReportedTypeMember,
  getReportedTypeMember,
} from './member-ownership.js';
import { isRequiredParserServices, type RequiredParserServices } from '../parser-services.js';
import { areMutuallyAssignableTypes } from '../type.js';

type SourceCache = {
  components: CollectedComponent[] | undefined;
  componentAnalysisByNode: WeakMap<estree.Node, ComponentAnalysis>;
  candidateOwnersByTypeDecl: WeakMap<estree.Node, CollectedComponent[] | null>;
};
type ReportedTypeMember = NonNullable<ReturnType<typeof getReportedTypeMember>>;

const perSourceCache = new WeakMap<SourceCode, SourceCache>();

/**
 * TypeScript fallback for finding component owners.
 *
 * The reported node is inside a reported type that acts as a React props
 * type, such as
 * `interface FooProps { ... }` or `type FooProps = ...`.
 *
 * We scan the components in the file and keep the ones whose props match that
 * reported type declaration.
 * If the report is on a specific member such as `sharedValue`, we first try to match that
 * member. If that is not possible, we fall back to matching the whole reported
 * type.
 *
 * @returns Every component that owns the reported type. Returns an empty array when
 * no match is found.
 */
export function findComponentOwnersByType(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
  keys: SourceCode.VisitorKeys,
): estree.Node[] {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return [];
  }

  const checker = services.program.getTypeChecker();
  const reportedType = getReportedTypeFromAncestors(ancestors, services, checker);
  if (!reportedType) {
    return [];
  }

  const sourceCache = getSourceCache(context.sourceCode);
  const components =
    sourceCache.components ??
    (sourceCache.components = collectComponents(context.sourceCode.ast, keys));
  if (components.length === 0) {
    return [];
  }

  const candidateOwners = getCandidateOwnersByReportedType(
    sourceCache,
    components,
    services,
    checker,
    reportedType,
  );
  if (candidateOwners.length === 0) {
    return [];
  }

  const reportedTypeMember = getReportedTypeMember(ancestors, services, checker);
  if (reportedTypeMember) {
    return findComponentOwnersByReportedTypeMember(
      sourceCache,
      candidateOwners,
      services,
      checker,
      reportedType,
      reportedTypeMember,
    ).map(component => component.componentNode);
  }

  return findComponentOwnersByReportedType(
    sourceCache,
    candidateOwners,
    services,
    checker,
    reportedType,
  ).map(component => component.componentNode);
}

function getCandidateOwnersByReportedType(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
): CollectedComponent[] {
  const cacheKey = reportedType.declaration as unknown as estree.Node;
  const cachedOwners = sourceCache.candidateOwnersByTypeDecl.get(cacheKey);
  if (cachedOwners !== undefined) {
    return cachedOwners ?? [];
  }

  const owners = components.filter(component =>
    componentMayUseReportedType(
      getComponentAnalysis(sourceCache, component, services),
      checker,
      reportedType,
    ),
  );
  sourceCache.candidateOwnersByTypeDecl.set(cacheKey, owners.length > 0 ? owners : null);
  return owners;
}

function findComponentOwnersByReportedTypeMember(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember,
): CollectedComponent[] {
  return components.filter(component =>
    componentPropsIncludeReportedTypeMember(
      getComponentAnalysis(sourceCache, component, services),
      checker,
      reportedType,
      reportedTypeMember,
    ),
  );
}

function findComponentOwnersByReportedType(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
): CollectedComponent[] {
  return components.filter(component =>
    componentUsesReportedType(
      getComponentAnalysis(sourceCache, component, services),
      checker,
      reportedType,
    ),
  );
}

function componentUsesReportedType(
  componentAnalysis: ComponentAnalysis,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
): boolean {
  return componentAnalysis.enclosingTypePropsTypeCandidates.some(componentPropsType =>
    areMutuallyAssignableTypes(checker, reportedType.tsType, componentPropsType),
  );
}

function componentMayUseReportedType(
  componentAnalysis: ComponentAnalysis,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
): boolean {
  return componentAnalysis.memberPropsTypeCandidates.some(componentPropsType =>
    reportedType.isUsedByType(componentPropsType, checker),
  );
}

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      components: undefined,
      componentAnalysisByNode: new WeakMap<estree.Node, ComponentAnalysis>(),
      candidateOwnersByTypeDecl: new WeakMap<estree.Node, CollectedComponent[] | null>(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

function getComponentAnalysis(
  sourceCache: SourceCache,
  component: CollectedComponent,
  services: RequiredParserServices,
): ComponentAnalysis {
  let componentAnalysis = sourceCache.componentAnalysisByNode.get(component.componentNode);
  if (!componentAnalysis) {
    componentAnalysis = createComponentAnalysis(component, services);
    sourceCache.componentAnalysisByNode.set(component.componentNode, componentAnalysis);
  }
  return componentAnalysis;
}
