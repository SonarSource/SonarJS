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
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  expandMessage,
  report,
  toSecondaryLocation,
  type IssueLocation,
  type LocationHolder,
} from '../helpers/location.js';

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

/**
 * Re-raises prefer-readonly member reports as a single class-level issue while
 * preserving the upstream member messages as secondary locations and combining
 * their quick fixes when ESLint can merge them safely.
 */
export function reportGroupedIssue(
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

export function reportUngrouped(
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
