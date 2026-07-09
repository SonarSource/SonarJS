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
import * as meta from './generated-meta.js';
import { reportGroupedIssue, reportUngrouped } from './reporting.js';

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;
type ListenerFunction<Node extends TSESTree.Node> = (node: Node) => void;
type ProgramExitListener = NonNullable<Rule.RuleListener['Program:exit']>;
type ProgramNode = Parameters<ProgramExitListener>[0];

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

      const listener = interceptedRule.create(context);
      const onClass = listener['ClassDeclaration, ClassExpression'] as
        ListenerFunction<ClassNode> | undefined;
      const onProgramExit = listener['Program:exit'] as ProgramExitListener | undefined;

      return {
        ...listener,
        'ClassDeclaration, ClassExpression'(node: ClassNode) {
          classNodes.push(node);
          if (typeof onClass === 'function') {
            onClass(node);
          }
        },
        'Program:exit'(node: ProgramNode) {
          if (typeof onProgramExit === 'function') {
            onProgramExit(node);
          }

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
        },
      };
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
    if (isBetterOwningClassCandidate(owner, classNode, index)) {
      owner = classNode;
    }
  }

  return owner;
}

/**
 * Prefer the most specific class enclosing the report location so nested class members
 * are grouped under the inner class rather than the outer container.
 */
function isBetterOwningClassCandidate(
  currentOwner: ClassNode | null,
  candidateClass: ClassNode,
  index: number,
) {
  const candidateContainsIndex =
    candidateClass.range[0] <= index && index <= candidateClass.range[1];
  const candidateIsMoreSpecific =
    currentOwner === null || candidateClass.range[0] >= currentOwner.range[0];
  return candidateContainsIndex && candidateIsMoreSpecific;
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
