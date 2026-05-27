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
  candidateOwnersByTypeDecl: WeakMap<object, CollectedComponent[] | null>;
  relevantOwnersByReportedTypeUsageSubject: WeakMap<object, CollectedComponent[] | null>;
  reportedTypeUsageBySubject: WeakMap<object, WeakMap<estree.Node, ComponentReportedTypeUsage>>;
};
type ReportedTypeMember = NonNullable<ReturnType<typeof getReportedTypeMember>>;
type ReportedSubject = {
  candidateOwnerCacheKey: object;
  getNonPropsSlotCandidates(componentAnalysis: ComponentAnalysis): ts.Type[];
  getPropsSlotCandidates(componentAnalysis: ComponentAnalysis): ts.Type[];
  usageCacheKey: object;
  matchesCandidateOwner(componentAnalysis: ComponentAnalysis): boolean;
  matchesNonPropsSlot(slotType: ts.Type): boolean;
  matchesPropsSlot(slotType: ts.Type): boolean;
  matchesRelevantOwner(componentAnalysis: ComponentAnalysis): boolean;
};
type ReportedSubjectContext = {
  checker: ts.TypeChecker;
  components: CollectedComponent[];
  reportedSubject: ReportedSubject;
  services: RequiredParserServices;
  sourceCache: SourceCache;
};
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
 * Only `props` and `mixed` candidates are returned as owners. Pure
 * `non-props` and `other` classifications are excluded because this helper
 * models the owner set that remains relevant for props reporting.
 *
 * @returns Every component that owns the reported type. Returns an empty array when
 * no match is found.
 */
export function findComponentOwnersByType(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): estree.Node[] {
  const subjectContext = getReportedSubjectContext(ancestors, context);
  if (!subjectContext) {
    return [];
  }

  const { components, reportedSubject, services, sourceCache } = subjectContext;
  const candidateOwners = getCandidateOwnersByReportedSubject(
    sourceCache,
    components,
    services,
    reportedSubject,
  );
  if (candidateOwners.length === 0) {
    return [];
  }

  return findComponentOwnersByReportedTypeUsage(
    sourceCache,
    candidateOwners,
    services,
    reportedSubject,
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

  const subjectContext = getReportedSubjectContext(ancestors, context);
  if (!subjectContext) {
    return 'other';
  }

  const { reportedSubject, services, sourceCache } = subjectContext;
  return getComponentReportedTypeUsageFromDetails(
    sourceCache,
    componentNode,
    services,
    reportedSubject,
  );
}

/**
 * Returns true when the reported type or reported member has at least one
 * relevant component owner and every such owner uses it only in React class
 * non-props slots (`state` / `snapshot`).
 *
 * This is broader than `findComponentOwnersByType(...)`: it also considers
 * components whose class non-props slots mention the reported type or reported
 * member, even when they are excluded from that props-reporting owner set.
 */
export function hasOnlyReactClassNonPropsReportedTypeUsage(
  node: estree.Node,
  context: Rule.RuleContext,
): boolean {
  const subjectContext = getReportedSubjectContext(context.sourceCode.getAncestors(node), context);
  if (!subjectContext) {
    return false;
  }

  const { components, reportedSubject, services, sourceCache } = subjectContext;
  const relevantOwners = getRelevantOwnersByReportedTypeUsage(
    sourceCache,
    components,
    services,
    reportedSubject,
  );
  if (relevantOwners.length === 0) {
    return false;
  }

  return relevantOwners.every(component => {
    const usage = getComponentReportedTypeUsageFromDetails(
      sourceCache,
      component.componentNode,
      services,
      reportedSubject,
    );
    return usage === 'non-props';
  });
}

function getReportedSubjectContext(
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): ReportedSubjectContext | undefined {
  const services = context.sourceCode.parserServices;
  if (!isRequiredParserServices(services)) {
    return undefined;
  }

  const checker = services.program.getTypeChecker();
  const reportedType = getReportedTypeFromAncestors(ancestors, services, checker);
  if (!reportedType) {
    return undefined;
  }

  const sourceCache = getSourceCache(context.sourceCode);
  const components =
    sourceCache.components ??
    (sourceCache.components = collectComponents(
      context.sourceCode.ast,
      context.sourceCode.visitorKeys,
    ));
  if (components.length === 0) {
    return undefined;
  }

  const reportedTypeMember = getReportedTypeMember(ancestors, services, checker);
  return {
    checker,
    components,
    reportedSubject: createReportedSubject(checker, reportedType, reportedTypeMember),
    services,
    sourceCache,
  };
}

function createReportedSubject(
  checker: ts.TypeChecker,
  reportedType: ReportedType,
  reportedTypeMember: ReportedTypeMember | undefined,
): ReportedSubject {
  const matchesCandidateOwner = (componentAnalysis: ComponentAnalysis) =>
    componentAnalysis.memberPropsTypeCandidates.some(componentPropsType =>
      reportedType.isUsedByType(componentPropsType, checker),
    );

  if (reportedTypeMember) {
    const includesReportedMember = (slotType: ts.Type) =>
      slotIncludesReportedTypeMember(slotType, checker, reportedType, reportedTypeMember);

    return {
      candidateOwnerCacheKey: reportedType.declaration,
      getNonPropsSlotCandidates(componentAnalysis) {
        return componentAnalysis.classNonPropsTypeCandidates;
      },
      getPropsSlotCandidates(componentAnalysis) {
        return componentAnalysis.memberPropsTypeCandidates;
      },
      usageCacheKey: reportedTypeMember.declaration,
      matchesCandidateOwner,
      matchesNonPropsSlot: includesReportedMember,
      matchesPropsSlot: includesReportedMember,
      matchesRelevantOwner(componentAnalysis) {
        return (
          componentAnalysis.memberPropsTypeCandidates.some(includesReportedMember) ||
          componentAnalysis.classNonPropsTypeCandidates.some(includesReportedMember)
        );
      },
    };
  }

  const usesReportedType = (slotType: ts.Type) => reportedType.isUsedByType(slotType, checker);
  return {
    candidateOwnerCacheKey: reportedType.declaration,
    getNonPropsSlotCandidates(componentAnalysis) {
      return componentAnalysis.classNonPropsTypeCandidates;
    },
    getPropsSlotCandidates(componentAnalysis) {
      return componentAnalysis.enclosingTypePropsTypeCandidates;
    },
    usageCacheKey: reportedType.declaration,
    matchesCandidateOwner,
    matchesNonPropsSlot(slotType) {
      return areSameTypeDeclarations(checker, reportedType.tsType, slotType);
    },
    matchesPropsSlot(slotType) {
      return areMutuallyAssignableTypes(checker, reportedType.tsType, slotType);
    },
    matchesRelevantOwner(componentAnalysis) {
      return (
        componentAnalysis.memberPropsTypeCandidates.some(usesReportedType) ||
        componentAnalysis.classNonPropsTypeCandidates.some(usesReportedType)
      );
    },
  };
}

function getCandidateOwnersByReportedSubject(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  reportedSubject: ReportedSubject,
): CollectedComponent[] {
  const cacheKey = reportedSubject.candidateOwnerCacheKey;
  const cachedOwners = sourceCache.candidateOwnersByTypeDecl.get(cacheKey);
  if (cachedOwners !== undefined) {
    return cachedOwners ?? [];
  }

  const owners = components.filter(component =>
    reportedSubject.matchesCandidateOwner(getComponentAnalysis(sourceCache, component, services)),
  );
  sourceCache.candidateOwnersByTypeDecl.set(cacheKey, owners.length > 0 ? owners : null);
  return owners;
}

function getRelevantOwnersByReportedTypeUsage(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  reportedSubject: ReportedSubject,
): CollectedComponent[] {
  const cacheKey = reportedSubject.usageCacheKey;
  const cachedOwners = sourceCache.relevantOwnersByReportedTypeUsageSubject.get(cacheKey);
  if (cachedOwners !== undefined) {
    return cachedOwners ?? [];
  }

  const owners = components.filter(component =>
    reportedSubject.matchesRelevantOwner(getComponentAnalysis(sourceCache, component, services)),
  );
  sourceCache.relevantOwnersByReportedTypeUsageSubject.set(cacheKey, owners.length > 0 ? owners : null);
  return owners;
}

function findComponentOwnersByReportedTypeUsage(
  sourceCache: SourceCache,
  components: CollectedComponent[],
  services: RequiredParserServices,
  reportedSubject: ReportedSubject,
): CollectedComponent[] {
  return components.filter(component =>
    isPropsUsage(
      getComponentReportedTypeUsageFromDetails(
        sourceCache,
        component.componentNode,
        services,
        reportedSubject,
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
  reportedSubject: ReportedSubject,
): ComponentReportedTypeUsage {
  const cacheKey = reportedSubject.usageCacheKey;
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
  const isPropsType = usesReportedTypeAsComponentProps(componentAnalysis, reportedSubject);
  const isNonPropsType = usesReportedTypeAsReactClassNonProps(componentAnalysis, reportedSubject);

  let usage: ComponentReportedTypeUsage = 'other';
  if (isNonPropsType) {
    usage = isPropsType ? 'mixed' : 'non-props';
  } else if (isPropsType) {
    usage = 'props';
  }

  usagesByComponent.set(componentNode, usage);
  return usage;
}

function usesReportedTypeAsComponentProps(
  componentAnalysis: ComponentAnalysis,
  reportedSubject: ReportedSubject,
): boolean {
  return reportedSubject.getPropsSlotCandidates(componentAnalysis).some(componentPropsType =>
    reportedSubject.matchesPropsSlot(componentPropsType),
  );
}

function usesReportedTypeAsReactClassNonProps(
  componentAnalysis: ComponentAnalysis,
  reportedSubject: ReportedSubject,
): boolean {
  return reportedSubject.getNonPropsSlotCandidates(componentAnalysis).some(nonPropsType =>
    reportedSubject.matchesNonPropsSlot(nonPropsType),
  );
}

function getSourceCache(sourceCode: SourceCode): SourceCache {
  let cache = perSourceCache.get(sourceCode);
  if (!cache) {
    cache = {
      components: undefined,
      componentAnalysisByNode: new WeakMap<estree.Node, ComponentAnalysis>(),
      candidateOwnersByTypeDecl: new WeakMap<object, CollectedComponent[] | null>(),
      relevantOwnersByReportedTypeUsageSubject: new WeakMap<object, CollectedComponent[] | null>(),
      reportedTypeUsageBySubject: new WeakMap<
        object,
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
