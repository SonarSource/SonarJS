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
// https://sonarsource.github.io/rspec/#/rspec/S9019/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

// eslint-plugin-vue's ref-object-references.js tracks all ref-creating calls for a variable in a
// shared map keyed by reference node, overwriting entries per call it processes. When a ref-typed
// variable is reassigned to a *different* ref-creating call, whichever call is processed last
// (an artifact of import order, not of the code) determines whether the reassignment is flagged.
// Suppress that non-deterministic case: reassigning a ref to a new ref/computed/etc. is a
// legitimate Composition API pattern anyway, unlike assigning a plain value (still flagged).
const REF_CREATING_CALLEES = new Set([
  'ref',
  'computed',
  'toRef',
  'customRef',
  'shallowRef',
  'toRefs',
  'defineModel',
]);

function isRefToRefReassignment(node: estree.Node & Rule.NodeParentExtension): boolean {
  const { parent } = node;
  return (
    parent.type === 'AssignmentExpression' &&
    parent.operator === '=' &&
    parent.left === node &&
    parent.right.type === 'CallExpression' &&
    parent.right.callee.type === 'Identifier' &&
    REF_CREATING_CALLEES.has(parent.right.callee.name)
  );
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('messageId' in reportDescriptor && reportDescriptor.messageId === 'requireDotValue') {
        if (
          'node' in reportDescriptor &&
          isRefToRefReassignment(reportDescriptor.node as estree.Node & Rule.NodeParentExtension)
        ) {
          return;
        }
        const { messageId: _messageId, data, ...rest } = reportDescriptor;
        context.report({
          ...rest,
          message: `Add '.value' to read or write the value wrapped by '${data?.method}()'.`,
        });
      } else {
        context.report(reportDescriptor);
      }
    },
  );
}
