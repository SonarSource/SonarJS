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
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const VUE_FQN_PREFIX = 'vue.';

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

function isRefCreatingCallee(context: Rule.RuleContext, callee: estree.Identifier): boolean {
  const fqn = getFullyQualifiedName(context, callee);
  // Resolving the import binding recognizes aliased imports too, e.g.
  // `import { computed as makeComputed } from 'vue'`. Names with no resolvable import
  // binding (e.g. `defineModel`, a <script setup> compiler macro that needs no import)
  // fall back to matching the local spelling directly.
  if (fqn !== null) {
    return (
      fqn.startsWith(VUE_FQN_PREFIX) && REF_CREATING_CALLEES.has(fqn.slice(VUE_FQN_PREFIX.length))
    );
  }
  return REF_CREATING_CALLEES.has(callee.name);
}

function isRefToRefReassignment(
  context: Rule.RuleContext,
  node: estree.Node & Rule.NodeParentExtension,
): boolean {
  const { parent } = node;
  return (
    parent.type === 'AssignmentExpression' &&
    parent.operator === '=' &&
    parent.left === node &&
    parent.right.type === 'CallExpression' &&
    parent.right.callee.type === 'Identifier' &&
    isRefCreatingCallee(context, parent.right.callee)
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
          isRefToRefReassignment(
            context,
            reportDescriptor.node as estree.Node & Rule.NodeParentExtension,
          )
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
