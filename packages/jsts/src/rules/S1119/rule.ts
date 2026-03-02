/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S1119/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { childrenOf, generateMeta, isFunctionNode } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const LOOP_TYPES = new Set([
  'ForStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
]);

function isLoop(node: estree.Node): boolean {
  return LOOP_TYPES.has(node.type);
}

/**
 * Collects ancestor chains for all break/continue statements referencing
 * `labelName` within `current`, stopping at function boundaries.
 * Each entry in `result` is the ancestor chain from the start of traversal
 * down to the statement's immediate parent.
 */
function collectLabelRefAncestors(
  current: estree.Node,
  labelName: string,
  ancestorChain: estree.Node[],
  visitorKeys: SourceCode.VisitorKeys,
  result: estree.Node[][],
): void {
  if (isFunctionNode(current)) {
    return;
  }

  if (
    (current.type === 'BreakStatement' || current.type === 'ContinueStatement') &&
    current.label?.name === labelName
  ) {
    result.push(ancestorChain);
  }

  for (const child of childrenOf(current, visitorKeys)) {
    collectLabelRefAncestors(child, labelName, [...ancestorChain, current], visitorKeys, result);
  }
}

/**
 * Returns true if the ancestor chain contains at least one nested loop.
 * ancestors[0] is always the labeled loop body itself, so we skip it.
 */
function hasNestedLoop(ancestors: estree.Node[]): boolean {
  return ancestors.slice(1).some(isLoop);
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeLabel: 'Refactor the code to remove this label and the need for it.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      LabeledStatement(node) {
        const body = node.body;

        // If the labeled body is not a loop, always report
        if (!isLoop(body)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // Collect ancestor chains for all break/continue referencing this label
        const refAncestors: estree.Node[][] = [];
        collectLabelRefAncestors(
          body,
          node.label.name,
          [],
          context.sourceCode.visitorKeys,
          refAncestors,
        );

        // No references: label on loop is unused → report
        if (refAncestors.length === 0) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // Report if any reference is not from within a nested loop
        for (const ancestors of refAncestors) {
          if (!hasNestedLoop(ancestors)) {
            context.report({
              messageId: 'removeLabel',
              node: node.label,
            });
            return;
          }
        }

        // All references are multi-level loop exits: suppress
      },
    };
  },
};
