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
import { interceptReport } from './interceptor.js';
import {
  expandMessage,
  report,
  toSecondaryLocation,
  type IssueLocation,
  type LocationHolder,
} from '../location.js';

type ListenerFunction = (node: TSESTree.Node) => void;

export interface GroupReportsOptions<Node extends TSESTree.Node> {
  /**
   * Selector of the upstream listener whose reports should be grouped. The upstream
   * rule is expected to emit all of a container's reports while this handler runs
   * (e.g. `typescript-eslint/prefer-readonly` reports every member on class exit).
   */
  listenerSelector: string;
  /** Anchors the single grouped issue, derived from the node passed to the listener. */
  getPrimaryLocation: (node: Node) => LocationHolder;
  /** Message of the grouped issue. */
  message: string;
  /** Secondary-location message used when a report exposes no resolvable message. */
  fallbackSecondaryMessage: string;
}

/**
 * Decorates an upstream rule that emits one report per offending element while
 * visiting a container node, re-raising them as a SINGLE issue anchored on the
 * container, with one secondary location per element and a combined quick fix.
 *
 * Reports are buffered only while the `listenerSelector` handler runs; any report
 * emitted outside that window is forwarded unchanged. When a member cannot be
 * located (so grouping would silently drop it), every report is re-emitted on its
 * own instead — still through `report()` so the messages stay encoded.
 */
export function groupReports<Node extends TSESTree.Node>(
  rule: Rule.RuleModule,
  options: GroupReportsOptions<Node>,
): Rule.RuleModule {
  return {
    ...rule,
    create(context: Rule.RuleContext) {
      let bufferedReports: Rule.ReportDescriptor[] | undefined;

      const interceptedRule = interceptReport(rule, (_context, reportDescriptor) => {
        if (bufferedReports) {
          bufferedReports.push(reportDescriptor);
          return;
        }

        context.report(reportDescriptor);
      });
      const listener = interceptedRule.create(context);
      const groupedListener = listener[options.listenerSelector];
      if (typeof groupedListener !== 'function') {
        // No handler under the expected selector. If the rule registered nothing at
        // all it is simply inactive for this file (e.g. a type-aware rule sanitized
        // because type information is unavailable), so there is nothing to group.
        // But if it registered other listeners, it is reporting somewhere we do not
        // intercept (e.g. the upstream selector was renamed across a dependency
        // bump): fail loudly rather than silently disabling the rule.
        if (Object.keys(listener).length > 0) {
          throw new Error(
            `Cannot group reports: the decorated rule has no "${options.listenerSelector}" listener to intercept.`,
          );
        }
        return listener;
      }

      return {
        ...listener,
        [options.listenerSelector](node: Node) {
          const previousReports = bufferedReports;
          bufferedReports = [];

          (groupedListener as ListenerFunction)(node);

          const groupedReports = bufferedReports;
          bufferedReports = previousReports;

          if (groupedReports.length > 0) {
            reportGroupedIssue(context, rule, node, groupedReports, options);
          }
        },
      };
    },
  };
}

function reportGroupedIssue<Node extends TSESTree.Node>(
  context: Rule.RuleContext,
  rule: Rule.RuleModule,
  node: Node,
  groupedReports: Rule.ReportDescriptor[],
  options: GroupReportsOptions<Node>,
) {
  const primaryLocation = options.getPrimaryLocation(node);
  const secondaryLocations = groupedReports.map(reportDescriptor =>
    getSecondaryLocation(rule, reportDescriptor, options.fallbackSecondaryMessage),
  );

  if (!primaryLocation.loc || !secondaryLocations.every(isIssueLocation)) {
    // A member could not be located, so grouping would silently drop it. Re-emit
    // each report on its own, still through `report()` so the message stays encoded
    // and decodable by the linter (a grouped rule declares `hasSecondaries`).
    groupedReports.forEach(reportDescriptor =>
      reportUngrouped(context, rule, reportDescriptor, options.fallbackSecondaryMessage),
    );
    return;
  }

  const fix = getCombinedFix(groupedReports);
  report(
    context,
    {
      loc: primaryLocation.loc,
      message: options.message,
      ...(fix && { fix }),
    },
    secondaryLocations,
  );
}

function reportUngrouped(
  context: Rule.RuleContext,
  rule: Rule.RuleModule,
  reportDescriptor: Rule.ReportDescriptor,
  fallbackMessage: string,
) {
  const locationHolder = toLocationHolder(reportDescriptor);
  if (!locationHolder?.loc) {
    // No location the linter could anchor an issue on; nothing to report.
    return;
  }

  const { fix } = reportDescriptor;
  report(context, {
    loc: locationHolder.loc,
    message: getReportMessage(rule, reportDescriptor, fallbackMessage),
    ...(typeof fix === 'function' && { fix }),
  });
}

function getSecondaryLocation(
  rule: Rule.RuleModule,
  reportDescriptor: Rule.ReportDescriptor,
  fallbackMessage: string,
): IssueLocation | null {
  const locationHolder = toLocationHolder(reportDescriptor);
  if (!locationHolder) {
    return null;
  }

  return toSecondaryLocation(
    locationHolder,
    getReportMessage(rule, reportDescriptor, fallbackMessage),
  );
}

/**
 * Adapts an ESLint report descriptor to a `LocationHolder` so location handling
 * can be delegated to `toSecondaryLocation`/`report`. A descriptor's `loc` may be
 * a full `SourceLocation` or a bare `Position`; the latter is widened to a range.
 */
function toLocationHolder(reportDescriptor: Rule.ReportDescriptor): LocationHolder | null {
  if ('node' in reportDescriptor && reportDescriptor.node) {
    return reportDescriptor.node;
  }

  if ('loc' in reportDescriptor && reportDescriptor.loc) {
    const { loc } = reportDescriptor;
    return { loc: 'start' in loc ? loc : { start: loc, end: loc } };
  }

  return null;
}

function isIssueLocation(location: IssueLocation | null): location is IssueLocation {
  return location !== null;
}

function getReportMessage(
  rule: Rule.RuleModule,
  reportDescriptor: Rule.ReportDescriptor,
  fallbackMessage: string,
): string {
  if ('message' in reportDescriptor) {
    return expandMessage(reportDescriptor.message, reportDescriptor.data);
  }

  if ('messageId' in reportDescriptor) {
    const template = rule.meta?.messages?.[reportDescriptor.messageId];
    if (template) {
      return expandMessage(template, reportDescriptor.data);
    }
  }

  return fallbackMessage;
}

function getCombinedFix(groupedReports: Rule.ReportDescriptor[]): Rule.ReportFixer | undefined {
  if (!groupedReports.some(reportDescriptor => typeof reportDescriptor.fix === 'function')) {
    return undefined;
  }

  return (fixer: Rule.RuleFixer) => {
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

    return sortNonOverlapping(fixes);
  };
}

/**
 * ESLint merges the fixes returned from a single `fix()` into one edit, but throws
 * if any two ranges overlap. Combining independent member fixes can, in theory,
 * surface such a pair; sort them and drop overlaps so a grouped quick fix degrades
 * (a member is left unfixed) instead of crashing the file's analysis.
 */
function sortNonOverlapping(fixes: Rule.Fix[]): Rule.Fix[] | null {
  fixes.sort((a, b) => a.range[0] - b.range[0] || a.range[1] - b.range[1]);

  const merged: Rule.Fix[] = [];
  let lastEnd = Number.MIN_SAFE_INTEGER;
  for (const fix of fixes) {
    if (fix.range[0] < lastEnd) {
      continue;
    }
    merged.push(fix);
    lastEnd = fix.range[1];
  }

  return merged.length > 0 ? merged : null;
}

function isIterableFix(fix: Rule.Fix | Iterable<Rule.Fix>): fix is Iterable<Rule.Fix> {
  return Symbol.iterator in fix;
}
