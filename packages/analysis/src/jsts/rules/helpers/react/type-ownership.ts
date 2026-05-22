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
  type ComponentNode,
  isComponentNode,
} from './component-analysis.js';
import { getReportedTypeFromAncestors, type ReportedType } from '../reported-type.js';
import { getReportedTypeMember, slotIncludesReportedTypeMember } from './member-ownership.js';
import { isRequiredParserServices, type RequiredParserServices } from '../parser-services.js';
import { areMutuallyAssignableTypes, areSameTypeDeclarations } from '../type.js';

type SourceCache = {
  components: CollectedComponent[] | undefined;
  componentAnalysisByNode: WeakMap<estree.Node, ComponentAnalysis>;
  candidateOwnersByTypeDecl: WeakMap<estree.Node, CollectedComponent[] | null>;
  reportedTypeUsageBySubject: WeakMap<
    estree.Node,
    WeakMap<estree.Node, ComponentReportedTypeUsage>
  >;
};
type ReportedTypeMember = NonNullable<ReturnType<typeof getReportedTypeMember>>;
export type ComponentReportedTypeUsage = 'mixed' | 'non-props' | 'other' | 'props';

const perSourceCache = new WeakMap<SourceCode, SourceCache>();

/**
 * TypeScript fallback for finding component owners.
 *
 * The reported node is inside a reported type that acts as a React props
 * type, such as
 * `interface FooProps { ... }` or `type FooProps = ...`.
 *
 * We scan the components in the file in two stages:
 * - keep only candidates whose props mention the reported declaration at all
 * - classify each candidate as `props`, `non-props`, `mixed`, or `other`
 *
 * Only `props` and `mixed` candidates are returned as owners.
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
  return findComponentOwnersByReportedTypeUsage(
    sourceCache,
    candidateOwners,
    services,
    checker,
    reportedType,
    reportedTypeMember,
  ).map(component => component.componentNode);
}

/**
 * Classifies how a reported type declaration is used by a specific component.
 *
 * Examples:
 * - `class Anchor extends React.Component<Props, State>` => `State` is `non-props`
 * - `class Panel extends React.Component<Props>` => `Props` is `props`
 * - `class Panel extends React.Component<Readonly<Props>, Props>` => `Props` is `mixed`
 */
export function getComponentReportedTypeUsage(
  componentNode: estree.Node,
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): ComponentReportedTypeUsage {
  if (!isComponentNode(componentNode)) {
    return 'other';
  }

  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return 'other';
  }

  const checker = services.program.getTypeChecker();
  const reportedType = getReportedTypeFromAncestors(ancestors, services, checker);
  if (!reportedType) {
    return 'other';
  }

  const reportedTypeMember = getReportedTypeMember(ancestors, services, checker);
  return getComponentReportedTypeUsageFromDetails(
    getSourceCache(context.sourceCode),
    componentNode,
    services,
    checker,
    reportedType,
    reportedTypeMember,
  );
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

function findComponentOwnersByReportedTypeUsage(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember | undefined,
): CollectedComponent[] {
  return components.filter(component =>
    isPropsUsage(
      getComponentReportedTypeUsageFromDetails(
        sourceCache,
        component.componentNode,
        services,
        checker,
        reportedType,
        reportedTypeMember,
      ),
    ),
  );
}

function isPropsUsage(usage: ComponentReportedTypeUsage): boolean {
  return usage === 'mixed' || usage === 'props';
}

function getComponentReportedTypeUsageFromDetails(
  sourceCache: SourceCache,
  componentNode: ComponentNode,
  services: RequiredParserServices,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember | undefined,
): ComponentReportedTypeUsage {
  const cacheKey = getReportedTypeUsageCacheKey(reportedType, reportedTypeMember);
  let usagesByComponent = sourceCache.reportedTypeUsageBySubject.get(cacheKey);
  if (!usagesByComponent) {
    usagesByComponent = new WeakMap<estree.Node, ComponentReportedTypeUsage>();
    sourceCache.reportedTypeUsageBySubject.set(cacheKey, usagesByComponent);
  }

  const cached = usagesByComponent.get(componentNode);
  if (cached !== undefined) {
    return cached;
  }

  const componentAnalysis = getComponentAnalysis(sourceCache, componentNode, services);
  const isPropsType = usesReportedTypeAsComponentProps(
    componentAnalysis,
    checker,
    reportedType,
    reportedTypeMember,
  );
  const isNonPropsType = usesReportedTypeAsReactClassNonProps(
    componentAnalysis,
    checker,
    reportedType,
    reportedTypeMember,
  );

  let usage: ComponentReportedTypeUsage = 'other';
  if (isNonPropsType) {
    usage = isPropsType ? 'mixed' : 'non-props';
  } else if (isPropsType) {
    usage = 'props';
  }

  usagesByComponent.set(componentNode, usage);
  return usage;
}

function getReportedTypeUsageCacheKey(
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember | undefined,
): estree.Node {
  return (reportedTypeMember?.declaration ?? reportedType.declaration) as unknown as estree.Node;
}

function usesReportedTypeAsComponentProps(
  componentAnalysis: ComponentAnalysis,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember | undefined,
): boolean {
  if (reportedTypeMember) {
    return componentAnalysis.memberPropsTypeCandidates.some(componentPropsType =>
      slotIncludesReportedTypeMember(componentPropsType, checker, reportedType, reportedTypeMember),
    );
  }

  return componentAnalysis.enclosingTypePropsTypeCandidates.some(componentPropsType =>
    areMutuallyAssignableTypes(checker, reportedType.tsType, componentPropsType),
  );
}

function usesReportedTypeAsReactClassNonProps(
  componentAnalysis: ComponentAnalysis,
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember | undefined,
): boolean {
  if (reportedTypeMember) {
    return componentAnalysis.classNonPropsTypeCandidates.some(nonPropsType =>
      slotIncludesReportedTypeMember(nonPropsType, checker, reportedType, reportedTypeMember),
    );
  }

  return componentAnalysis.classNonPropsTypeCandidates.some(nonPropsType =>
    areSameTypeDeclarations(checker, reportedType.tsType, nonPropsType),
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
      reportedTypeUsageBySubject: new WeakMap<
        estree.Node,
        WeakMap<estree.Node, ComponentReportedTypeUsage>
      >(),
    };
    perSourceCache.set(sourceCode, cache);
  }
  return cache;
}

function getComponentAnalysis(
  sourceCache: SourceCache,
  component: CollectedComponent | ComponentNode,
  services: RequiredParserServices,
): ComponentAnalysis {
  const componentNode = 'componentNode' in component ? component.componentNode : component;
  let componentAnalysis = sourceCache.componentAnalysisByNode.get(componentNode);
  if (!componentAnalysis) {
    componentAnalysis = createComponentAnalysis(component, services);
    sourceCache.componentAnalysisByNode.set(componentNode, componentAnalysis);
  }
  return componentAnalysis;
}
