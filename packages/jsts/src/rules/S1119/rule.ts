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

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/index.js';
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

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeLabel: 'Refactor the code to remove this label and the need for it.',
    },
  }),
  create(context: Rule.RuleContext) {
    // Stack of currently active LabeledStatement nodes (innermost last).
    const labelStack: estree.LabeledStatement[] = [];
    // Map from LabeledStatement node to array of reference info objects.
    // hasNested: break/continue is inside a nested inner loop (for loop bodies).
    // isFromNestedSwitch: break/continue is inside a switch nested within the labeled body.
    const labelRefs = new Map<
      estree.LabeledStatement,
      { hasNested: boolean; isFromNestedSwitch: boolean }[]
    >();

    function onBreakOrContinue(node: estree.BreakStatement | estree.ContinueStatement) {
      if (!node.label) {
        return;
      }
      const labelName = node.label.name;

      // Find the latest matching label on the stack.
      let labeledStmt: estree.LabeledStatement | undefined;
      for (let i = labelStack.length - 1; i >= 0; i--) {
        if (labelStack[i].label.name === labelName) {
          labeledStmt = labelStack[i];
          break;
        }
      }
      if (!labeledStmt) {
        return;
      }

      const ancestors = context.sourceCode.getAncestors(node);
      const labelIdx = ancestors.indexOf(labeledStmt);
      // ancestors[labelIdx+1] is the labeled body.
      // Check if any ancestor beyond the labeled body is itself a loop,
      // indicating this break/continue is inside a nested inner loop.
      const hasNested = ancestors.slice(labelIdx + 2).some(isLoop);
      // Check if there is a switch statement between the labeled body and the break/continue.
      // A break inside a switch can only exit the switch with plain break; using a label
      // to exit an enclosing loop from within a switch is a legitimate pattern.
      const isFromNestedSwitch = ancestors
        .slice(labelIdx + 2)
        .some(a => a.type === 'SwitchStatement');

      const refs = labelRefs.get(labeledStmt);
      if (refs) {
        refs.push({ hasNested, isFromNestedSwitch });
      } else {
        labelRefs.set(labeledStmt, [{ hasNested, isFromNestedSwitch }]);
      }
    }

    return {
      LabeledStatement(node) {
        labelStack.push(node);
      },

      BreakStatement: onBreakOrContinue,
      ContinueStatement: onBreakOrContinue,

      'LabeledStatement:exit'(node) {
        labelStack.pop();

        const refs = labelRefs.get(node);
        labelRefs.delete(node);

        // Non-loop labeled body: always report (labels on blocks, if-statements, etc.)
        if (!isLoop(node.body)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // No references: label on loop is unused → report
        if (!refs || refs.length === 0) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
          return;
        }

        // Suppress if all references exit via a nested loop or via a nested switch.
        // Inside a switch, plain 'break' only exits the switch, so 'break label' is the
        // only way to exit an enclosing loop from within a switch — a legitimate pattern.
        if (refs.some(r => !r.hasNested && !r.isFromNestedSwitch)) {
          context.report({
            messageId: 'removeLabel',
            node: node.label,
          });
        }

        // All references are multi-level loop exits or from within nested switches: suppress
      },
    };
  },
};
