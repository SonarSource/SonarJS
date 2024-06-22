/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1751

import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import { isContinueStatement } from '../utils/nodes';
import docsUrl from '../utils/docs-url';

const rule: TSESLint.RuleModule<string, string[]> = {
  defaultOptions: [],
  meta: {
    messages: {
      refactorLoop: 'Refactor this loop to do more than one iteration.',
    },
    schema: [],
    type: 'problem',
    docs: {
      description: 'Loops with at most one iteration should be refactored',
      recommended: 'recommended',
      url: docsUrl(__filename),
    },
  },
  // @ts-ignore The typings of @typescript-eslint/utils does not contain the 'onX' methods.
  create(context) {
    const loopingNodes: Set<TSESTree.Node> = new Set();
    const loops: Set<TSESTree.Node> = new Set();
    const loopsAndTheirSegments: Array<{
      loop: TSESTree.WhileStatement | TSESTree.ForStatement;
      segments: Rule.CodePathSegment[];
    }> = [];
    const codePathSegments: Rule.CodePathSegment[][] = [];
    let currentCodePathSegments: Rule.CodePathSegment[] = [];

    return {
      ForStatement(node: TSESTree.Node) {
        loops.add(node);
      },
      WhileStatement(node: TSESTree.Node) {
        loops.add(node);
      },
      DoWhileStatement(node: TSESTree.Node) {
        loops.add(node);
      },
      onCodePathStart() {
        codePathSegments.push(currentCodePathSegments);
        currentCodePathSegments = [];
      },
      onCodePathSegmentStart(segment: Rule.CodePathSegment) {
        currentCodePathSegments.push(segment);
      },
      onCodePathSegmentEnd() {
        currentCodePathSegments.pop();
      },
      onCodePathEnd() {
        currentCodePathSegments = codePathSegments.pop()!;
      },
      'WhileStatement > *'(node: TSESTree.Node) {
        visitLoopChild(node.parent as TSESTree.WhileStatement);
      },
      'ForStatement > *'(node: TSESTree.Node) {
        visitLoopChild(node.parent as TSESTree.ForStatement);
      },
      onCodePathSegmentLoop(_: unknown, toSegment: Rule.CodePathSegment, node: TSESTree.Node) {
        if (isContinueStatement(node)) {
          loopsAndTheirSegments.forEach(({ segments, loop }) => {
            if (segments.includes(toSegment)) {
              loopingNodes.add(loop);
            }
          });
        } else {
          loopingNodes.add(node);
        }
      },
      'Program:exit'() {
        loops.forEach(loop => {
          if (!loopingNodes.has(loop)) {
            context.report({
              messageId: 'refactorLoop',
              loc: context.sourceCode.getFirstToken(loop)!.loc,
            });
          }
        });
      },
    };

    // Required to correctly process "continue" looping.
    // When a loop has a "continue" statement, this "continue" statement triggers a "onCodePathSegmentLoop" event,
    // and the corresponding event node is that "continue" statement. Current implementation is based on the fact
    // that the "onCodePathSegmentLoop" event is triggered with a loop node. To work this special case around,
    // we visit loop children and collect corresponding path segments as these segments are "toSegment"
    // in "onCodePathSegmentLoop" event.
    function visitLoopChild(parent: TSESTree.WhileStatement | TSESTree.ForStatement) {
      if (currentCodePathSegments.length > 0) {
        loopsAndTheirSegments.push({ segments: [...currentCodePathSegments], loop: parent });
      }
    }
  },
};

export = rule;
