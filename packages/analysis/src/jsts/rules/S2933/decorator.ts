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

import type { AST, Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  expandMessage,
  report,
  toSecondaryLocation,
  type IssueLocation,
  type LocationHolder,
} from '../helpers/location.js';
import * as meta from './generated-meta.js';

const GROUPED_MESSAGE = 'Mark these members as `readonly`.';
const FALLBACK_SECONDARY_MESSAGE = 'Member should be marked as `readonly`.';

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
type ListenerFunction = (node: TSESTree.Node) => void;

/**
 * Decorates typescript-eslint/prefer-readonly to raise one issue per class instead
 * of one issue per member. The upstream rule reports all offending members while
 * leaving a class, so the decorator groups only that well-defined reporting window.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    meta: generateMeta(meta, rule.meta),
    create(context: Rule.RuleContext) {
      let reportsForCurrentClass: Rule.ReportDescriptor[] | undefined;

      const interceptingContext = createReportInterceptingContext(context, reportDescriptor => {
        if (reportsForCurrentClass) {
          reportsForCurrentClass.push(reportDescriptor);
          return;
        }

        context.report(reportDescriptor);
      });
      const listener = rule.create(interceptingContext);
      const classExitListener = listener['ClassDeclaration, ClassExpression:exit'];

      return {
        ...listener,
        'ClassDeclaration, ClassExpression:exit'(node: ClassNode) {
          const previousReports = reportsForCurrentClass;
          reportsForCurrentClass = [];

          callListener(classExitListener, node);

          const groupedReports = reportsForCurrentClass;
          reportsForCurrentClass = previousReports;

          if (groupedReports.length > 0) {
            reportGroupedIssue(context, rule, node, groupedReports);
          }
        },
      };
    },
  };
}

function createReportInterceptingContext(
  context: Rule.RuleContext,
  onReport: (reportDescriptor: Rule.ReportDescriptor) => void,
): Rule.RuleContext {
  const interceptingContext = {
    report(...args: unknown[]) {
      const reportDescriptor = toReportDescriptor(args);
      if (reportDescriptor) {
        onReport(reportDescriptor);
        return;
      }

      context.report(...(args as Parameters<Rule.RuleContext['report']>));
    },
  };

  Object.setPrototypeOf(interceptingContext, context);
  return interceptingContext as Rule.RuleContext;
}

function toReportDescriptor(args: unknown[]): Rule.ReportDescriptor | undefined {
  if (args.length === 1) {
    return args[0] as Rule.ReportDescriptor;
  }

  if (args.length === 2 && typeof args[1] === 'string') {
    return {
      node: args[0] as Rule.Node,
      message: args[1],
    };
  }

  return undefined;
}

function callListener(listener: Rule.RuleListener[string], node: TSESTree.Node) {
  if (typeof listener === 'function') {
    (listener as ListenerFunction)(node);
  }
}

function reportGroupedIssue(
  context: Rule.RuleContext,
  rule: Rule.RuleModule,
  classNode: ClassNode,
  groupedReports: Rule.ReportDescriptor[],
) {
  const primaryLocation = getPrimaryLocation(classNode);
  const secondaryLocations = groupedReports.map(reportDescriptor =>
    getSecondaryLocation(rule, reportDescriptor),
  );

  if (!primaryLocation.loc || !secondaryLocations.every(isIssueLocation)) {
    groupedReports.forEach(reportDescriptor => context.report(reportDescriptor));
    return;
  }

  const fix = getCombinedFix(groupedReports);
  report(
    context,
    {
      loc: primaryLocation.loc,
      message: GROUPED_MESSAGE,
      ...(fix && { fix }),
    },
    secondaryLocations,
  );
}

function getPrimaryLocation(classNode: ClassNode): LocationHolder {
  return classNode.body.body.find(isConstructor) ?? classNode.id ?? classNode;
}

function isConstructor(node: TSESTree.ClassElement): node is TSESTree.MethodDefinition {
  return node.type === 'MethodDefinition' && node.kind === 'constructor';
}

function getSecondaryLocation(rule: Rule.RuleModule, reportDescriptor: Rule.ReportDescriptor) {
  const location = getReportLocation(reportDescriptor);
  if (!location) {
    return null;
  }

  return toSecondaryLocation(location, getReportMessage(rule, reportDescriptor));
}

function getReportLocation(reportDescriptor: Rule.ReportDescriptor): LocationHolder | null {
  if ('node' in reportDescriptor && reportDescriptor.node) {
    return reportDescriptor.node;
  }

  if ('loc' in reportDescriptor && reportDescriptor.loc) {
    if (isSourceLocation(reportDescriptor.loc)) {
      return { loc: reportDescriptor.loc };
    }

    return {
      loc: {
        start: reportDescriptor.loc,
        end: reportDescriptor.loc,
      },
    };
  }

  return null;
}

function isSourceLocation(loc: AST.SourceLocation | TSESTree.Position): loc is AST.SourceLocation {
  return 'start' in loc && 'end' in loc;
}

function isIssueLocation(location: IssueLocation | null): location is IssueLocation {
  return location !== null;
}

function getReportMessage(rule: Rule.RuleModule, reportDescriptor: Rule.ReportDescriptor) {
  if ('message' in reportDescriptor) {
    return expandMessage(reportDescriptor.message, reportDescriptor.data);
  }

  if ('messageId' in reportDescriptor) {
    const template = rule.meta?.messages?.[reportDescriptor.messageId];
    if (template) {
      return expandMessage(template, reportDescriptor.data);
    }
  }

  return FALLBACK_SECONDARY_MESSAGE;
}

function getCombinedFix(groupedReports: Rule.ReportDescriptor[]): Rule.ReportFixer | undefined {
  if (!groupedReports.every(reportDescriptor => typeof reportDescriptor.fix === 'function')) {
    return undefined;
  }

  return (fixer: Rule.RuleFixer) => {
    const fixes: Rule.Fix[] = [];

    for (const reportDescriptor of groupedReports) {
      const reportFixer = reportDescriptor.fix;
      if (typeof reportFixer !== 'function') {
        return null;
      }

      const fix = reportFixer(fixer);
      if (!fix) {
        return null;
      }

      if (isIterableFix(fix)) {
        fixes.push(...fix);
      } else {
        fixes.push(fix);
      }
    }

    return fixes;
  };
}

function isIterableFix(fix: Rule.Fix | Iterable<Rule.Fix>): fix is Iterable<Rule.Fix> {
  return Symbol.iterator in fix;
}
