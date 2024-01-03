/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S128/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { getParent } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      switchEnd:
        'End this switch case with an unconditional break, continue, return or throw statement.',
    },
  },
  create(context: Rule.RuleContext) {
    let currentCodePath: Rule.CodePath | null = null;
    let currentCodeSegment: Rule.CodePathSegment | null = null;
    let enteringSwitchCase = false;
    const segmentsWithExit: Set<string> = new Set();
    const initialSegmentBySwitchCase: Map<estree.SwitchCase, Rule.CodePathSegment> = new Map();
    const switchCaseStack: estree.SwitchCase[] = [];

    function noComment(node: estree.Node) {
      return context.sourceCode.getCommentsAfter(node).length === 0;
    }

    function isAfterProcessExitCall(
      segment: Rule.CodePathSegment,
      initialSegment: Rule.CodePathSegment,
    ) {
      const stack = [];
      const visitedSegments: Set<string> = new Set();
      stack.push(segment);
      while (stack.length !== 0) {
        const current = stack.pop()!;
        visitedSegments.add(current.id);
        if (!segmentsWithExit.has(current.id)) {
          if (current === initialSegment) {
            return false;
          }
          current.prevSegments.filter(p => !visitedSegments.has(p.id)).forEach(p => stack.push(p));
        }
      }
      return true;
    }

    return {
      onCodePathStart(codePath: Rule.CodePath) {
        currentCodePath = codePath;
      },
      onCodePathEnd() {
        currentCodePath = currentCodePath!.upper;
      },
      onCodePathSegmentStart(segment: Rule.CodePathSegment) {
        currentCodeSegment = segment;
        if (enteringSwitchCase) {
          initialSegmentBySwitchCase.set(
            switchCaseStack.pop() as estree.SwitchCase,
            currentCodeSegment,
          );
          enteringSwitchCase = false;
        }
      },
      CallExpression(node: estree.Node) {
        const callExpr = node as estree.CallExpression;
        if (isProcessExitCall(callExpr)) {
          segmentsWithExit.add(currentCodeSegment!.id);
        }
      },
      SwitchCase(node: estree.Node) {
        enteringSwitchCase = true;
        switchCaseStack.push(node as estree.SwitchCase);
      },
      'SwitchCase:exit'(node: estree.Node) {
        const switchCase = node as estree.SwitchCase;
        const initialSegment: Rule.CodePathSegment = initialSegmentBySwitchCase.get(switchCase)!;
        const isReachable = currentCodePath!.currentSegments.some(
          s => s.reachable && !isAfterProcessExitCall(s, initialSegment),
        );
        const { cases } = getParent(context) as estree.SwitchStatement;
        if (
          isReachable &&
          switchCase.consequent.length > 0 &&
          cases[cases.length - 1] !== node &&
          noComment(switchCase)
        ) {
          context.report({
            messageId: 'switchEnd',
            loc: context.sourceCode.getFirstToken(node)!.loc,
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
