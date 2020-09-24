/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

// https://jira.sonarsource.com/browse/RSPEC-128

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getParent } from 'eslint-plugin-sonarjs/lib/utils/nodes';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let currentCodePath: Rule.CodePath | null = null;
    let currentCodeSegment: Rule.CodePathSegment | null = null;
    const segmentsWithExit: Set<string> = new Set();
    const initialSegmentsBySwitchCase: Map<estree.SwitchCase, Rule.CodePathSegment> = new Map();
    const segmentsInSwitchCase: Map<estree.Node, Set<string>> = new Map();

    function noComment(node: estree.Node) {
      return context.getSourceCode().getCommentsAfter(node).length === 0;
    }

    function allSegmentsReachProcessExitCall(
      segment: Rule.CodePathSegment,
      segmentsToConsider: Set<string>,
    ): boolean {
      const stack = [];
      stack.push(segment);
      while (stack.length !== 0) {
        const current = stack.pop()!;
        if (!segmentsWithExit.has(current.id)) {
          if (current.nextSegments.length === 0 || !segmentsToConsider.has(current.id)) {
            return false;
          }
          current.nextSegments.forEach(n => stack.push(n));
        }
      }
      return true;
    }

    return {
      onCodePathStart(codePath: Rule.CodePath) {
        currentCodePath = codePath;
      },
      onCodePathSegmentStart(segment: Rule.CodePathSegment, node: estree.Node) {
        currentCodeSegment = segment;
        let switchCase = null;
        if (node.type === 'SwitchCase') {
          switchCase = node;
        } else {
          switchCase = context.getAncestors().find(parent => parent.type === 'SwitchCase');
        }
        if (!!switchCase) {
          const segmentsInCase = segmentsInSwitchCase.get(switchCase);
          if (!!segmentsInCase) {
            segmentsInCase.add(segment.id);
          } else {
            segmentsInSwitchCase.set(switchCase, new Set([currentCodeSegment.id]));
          }
        }
      },
      CallExpression(node: estree.Node) {
        const callExpr = node as estree.CallExpression;
        if (isProcessExitCall(callExpr)) {
          segmentsWithExit.add(currentCodeSegment!.id);
        }
      },
      SwitchCase(node: estree.Node) {
        initialSegmentsBySwitchCase.set(node as estree.SwitchCase, currentCodeSegment!);
      },
      'SwitchCase:exit'(node: estree.Node) {
        const switchCase = node as estree.SwitchCase;
        const initialSegment: Rule.CodePathSegment = initialSegmentsBySwitchCase.get(switchCase)!;
        const segmentsToConsider = segmentsInSwitchCase.get(switchCase);
        let allPathsCallExit = false;
        if (!!segmentsToConsider && segmentsWithExit.size !== 0) {
          segmentsToConsider.add(initialSegment.id);
          allPathsCallExit = allSegmentsReachProcessExitCall(initialSegment, segmentsToConsider);
        }
        const { cases } = getParent(context) as estree.SwitchStatement;
        if (
          currentCodePath!.currentSegments.some(s => s.reachable) &&
          switchCase.consequent.length > 0 &&
          cases[cases.length - 1] !== node &&
          noComment(switchCase) &&
          !allPathsCallExit
        ) {
          context.report({
            message:
              'End this switch case with an unconditional break, continue, return or throw statement.',
            loc: context.getSourceCode().getFirstToken(node)!.loc,
          });
        }
      },
    };
  },
};

function isProcessExitCall(callExpr: estree.CallExpression) {
  return (
    callExpr.callee.type === 'MemberExpression' &&
    callExpr.callee.object.type === 'Identifier' &&
    callExpr.callee.object.name === 'process' &&
    callExpr.callee.property.type === 'Identifier' &&
    callExpr.callee.property.name === 'exit'
  );
}
