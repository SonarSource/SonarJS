/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1751

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      refactorLoop: 'Refactor this loop to do more than one iteration.',
    },
  }),
  // @ts-ignore The typings of @typescript-eslint/utils does not contain the 'onX' methods.
  create(context) {
    const loopingNodes: Set<estree.Node> = new Set();
    const loops: Set<estree.Node> = new Set();
    const loopsAndTheirSegments: Array<{
      loop: estree.WhileStatement | estree.ForStatement;
      segments: Rule.CodePathSegment[];
    }> = [];
    const codePathSegments: Rule.CodePathSegment[][] = [];
    let currentCodePathSegments: Rule.CodePathSegment[] = [];

    return {
      ForStatement(node: estree.Node) {
        loops.add(node);
      },
      WhileStatement(node: estree.Node) {
        loops.add(node);
      },
      DoWhileStatement(node: estree.Node) {
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
      'WhileStatement > *'(node: estree.Node) {
        visitLoopChild((node as TSESTree.Node).parent as estree.WhileStatement);
      },
      'ForStatement > *'(node: estree.Node) {
        visitLoopChild((node as TSESTree.Node).parent as estree.ForStatement);
      },
      onCodePathSegmentLoop(_: unknown, toSegment: Rule.CodePathSegment, node: estree.Node) {
        if (node.type === 'ContinueStatement') {
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
    function visitLoopChild(parent: estree.WhileStatement | estree.ForStatement) {
      if (currentCodePathSegments.length > 0) {
        loopsAndTheirSegments.push({ segments: [...currentCodePathSegments], loop: parent });
      }
    }
  },
};
