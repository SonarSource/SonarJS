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
// https://sonarsource.github.io/rspec/#/rspec/S2933/javascript

import type { Rule } from 'eslint';
import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import {
  expandMessage,
  report,
  toSecondaryLocation,
  type IssueLocation,
  type LocationHolder,
} from '../helpers/location.js';
import * as meta from './generated-meta.js';

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

/**
 * Decorates typescript-eslint/prefer-readonly to raise one issue per class instead of
 * one issue per member. Reports are grouped from their owning class, not from the
 * upstream listener implementation, so dependency updates can change listener keys
 * without breaking the grouping.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, rule.meta),
    create(context: Rule.RuleContext) {
      const classNodes: ClassNode[] = [];
      const interceptedReports: Rule.ReportDescriptor[] = [];

      const interceptedRule = interceptReport(rule, (_context, reportDescriptor) => {
        interceptedReports.push(reportDescriptor);
      });

      function rememberClassForReportOwnershipLookup(node: ClassNode) {
        classNodes.push(node);
      }

      function reportInterceptedIssuesGroupedByOwningClass() {
        const groupedReports = new Map<ClassNode, Rule.ReportDescriptor[]>();
        const forwardedReports: Rule.ReportDescriptor[] = [];

        for (const reportDescriptor of interceptedReports) {
          const owner = getOwningClass(context, reportDescriptor, classNodes);
          if (!owner) {
            forwardedReports.push(reportDescriptor);
            continue;
          }

          const reports = groupedReports.get(owner);
          if (reports) {
            reports.push(reportDescriptor);
          } else {
            groupedReports.set(owner, [reportDescriptor]);
          }
        }

        for (const reportDescriptor of forwardedReports) {
          reportUngrouped(context, rule, reportDescriptor);
        }

        const groups = [...groupedReports.entries()].sort(
          ([leftClass], [rightClass]) => leftClass.range[0] - rightClass.range[0],
        );
        for (const [classNode, reports] of groups) {
          reportGroupedIssue(context, rule, classNode, sortReportsByLocation(context, reports));
        }

        interceptedReports.length = 0;
        classNodes.length = 0;
      }

      const listener = interceptedRule.create(context);
      const groupingListener: Rule.RuleListener = {
        'ClassDeclaration, ClassExpression': rememberClassForReportOwnershipLookup,
        'Program:exit': reportInterceptedIssuesGroupedByOwningClass,
      };

      return mergeRules(listener, groupingListener);
    },
  };
}

function getOwningClass(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
  classesInProgram: ClassNode[],
): ClassNode | null {
  const node = getReportNode(reportDescriptor);
  if (node) {
    const owner = findNearestClass(node);
    if (owner) {
      return owner;
    }
  }

  const start = getReportStartIndex(context, reportDescriptor);
  if (start === null) {
    return null;
  }

  return findInnermostClassContaining(classesInProgram, start);
}

function getReportNode(reportDescriptor: Rule.ReportDescriptor): TSESTree.Node | null {
  if ('node' in reportDescriptor && reportDescriptor.node) {
    return reportDescriptor.node as TSESTree.Node;
  }
  return null;
}

function findNearestClass(node: TSESTree.Node): ClassNode | null {
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.ClassDeclaration ||
      current.type === AST_NODE_TYPES.ClassExpression
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function findInnermostClassContaining(classes: ClassNode[], index: number): ClassNode | null {
  let owner: ClassNode | null = null;

  for (const classNode of classes) {
    if (classNode.range[0] <= index && index <= classNode.range[1]) {
      if (!owner || classNode.range[0] >= owner.range[0]) {
        owner = classNode;
      }
    }
  }

  return owner;
}

function sortReportsByLocation(context: Rule.RuleContext, reports: Rule.ReportDescriptor[]) {
  return [...reports].sort(
    (left, right) =>
      (getReportStartIndex(context, left) ?? Number.MAX_SAFE_INTEGER) -
      (getReportStartIndex(context, right) ?? Number.MAX_SAFE_INTEGER),
  );
}

function getReportStartIndex(
  context: Rule.RuleContext,
  reportDescriptor: Rule.ReportDescriptor,
): number | null {
  if ('node' in reportDescriptor && reportDescriptor.node?.range) {
    return reportDescriptor.node.range[0];
  }

  if ('loc' in reportDescriptor && reportDescriptor.loc) {
    const { loc } = reportDescriptor;
    return context.sourceCode.getIndexFromLoc('start' in loc ? loc.start : loc);
  }

  return null;
}

function reportGroupedIssue(
  context: Rule.RuleContext,
  rule: Rule.RuleModule,
  classNode: ClassNode,
  groupedReports: Rule.ReportDescriptor[],
) {
  const primaryLocation = classNode.id ?? classNode;
  const secondaryLocations = groupedReports.map(reportDescriptor =>
    getSecondaryLocation(rule, reportDescriptor),
  );

  if (!primaryLocation.loc || !secondaryLocations.every(isIssueLocation)) {
    groupedReports.forEach(reportDescriptor => reportUngrouped(context, rule, reportDescriptor));
    return;
  }

  const fix = getCombinedFix(groupedReports);
  report(
    context,
    {
      loc: primaryLocation.loc,
      message: 'Mark these members as `readonly`.',
      ...(fix && { fix }),
    },
    secondaryLocations,
  );
}

function reportUngrouped(
  context: Rule.RuleContext,
  rule: Rule.RuleModule,
  reportDescriptor: Rule.ReportDescriptor,
) {
  const locationHolder = toLocationHolder(reportDescriptor);
  if (!locationHolder?.loc) {
    return;
  }

  const fix = getCombinedFix([reportDescriptor]);
  report(context, {
    loc: locationHolder.loc,
    message: getReportMessage(rule, reportDescriptor),
    ...(fix && { fix }),
  });
}

function getSecondaryLocation(
  rule: Rule.RuleModule,
  reportDescriptor: Rule.ReportDescriptor,
): IssueLocation | null {
  const locationHolder = toLocationHolder(reportDescriptor);
  if (!locationHolder) {
    return null;
  }

  return toSecondaryLocation(locationHolder, getReportMessage(rule, reportDescriptor));
}

function isIssueLocation(location: IssueLocation | null): location is IssueLocation {
  return location !== null;
}

function toLocationHolder(reportDescriptor: Rule.ReportDescriptor): LocationHolder | null {
  if ('node' in reportDescriptor && reportDescriptor.node) {
    return reportDescriptor.node as TSESTree.Node;
  }

  if ('loc' in reportDescriptor && reportDescriptor.loc) {
    const { loc } = reportDescriptor;
    return { loc: 'start' in loc ? loc : { start: loc, end: loc } };
  }

  return null;
}

function getReportMessage(rule: Rule.RuleModule, reportDescriptor: Rule.ReportDescriptor): string {
  if ('message' in reportDescriptor) {
    return expandMessage(reportDescriptor.message, reportDescriptor.data);
  }

  if ('messageId' in reportDescriptor) {
    const template = rule.meta?.messages?.[reportDescriptor.messageId];
    if (template) {
      return expandMessage(template, reportDescriptor.data);
    }
  }

  return 'Member should be marked as `readonly`.';
}

function getCombinedFix(groupedReports: Rule.ReportDescriptor[]): Rule.ReportFixer | undefined {
  if (!groupedReports.some(reportDescriptor => typeof reportDescriptor.fix === 'function')) {
    return undefined;
  }

  // Reuse upstream fixes so modifier ordering, computed-property targets, and
  // additional type-annotation edits stay exactly aligned with prefer-readonly.
  return fixer => {
    const fixes: Rule.Fix[] = [];

    for (const reportDescriptor of groupedReports) {
      const reportFixer = reportDescriptor.fix;
      if (typeof reportFixer !== 'function') {
        continue;
      }

      const fix = reportFixer(fixer);
      if (!fix) {
        continue;
      }

      if (isIterableFix(fix)) {
        fixes.push(...fix);
      } else {
        fixes.push(fix);
      }
    }

    return removeOverlappingFixes(fixes);
  };
}

function isIterableFix(fix: Rule.Fix | Iterable<Rule.Fix>): fix is Iterable<Rule.Fix> {
  return Symbol.iterator in fix;
}

function removeOverlappingFixes(fixes: Rule.Fix[]): Rule.Fix[] {
  const sortedFixes = [...fixes].sort((left, right) => left.range[0] - right.range[0]);
  const result: Rule.Fix[] = [];
  let previousEnd = -1;

  for (const fix of sortedFixes) {
    if (fix.range[0] < previousEnd) {
      continue;
    }

    result.push(fix);
    previousEnd = fix.range[1];
  }

  return result;
}
