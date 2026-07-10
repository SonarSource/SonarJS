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
// https://sonarsource.github.io/rspec/#/rspec/S8980/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

// Reported by the upstream rule for `act(() => {})`; already covered by S1186.
const EMPTY_CALLBACK_MESSAGE_ID = 'noUnnecessaryActEmptyFunction';
// Reported by the upstream rule when it believes the `act()` callback consists
// entirely of Testing Library calls.
const TESTING_LIBRARY_UTIL_MESSAGE_ID = 'noUnnecessaryActTestingLibraryUtil';

// Upstream's non-strict mode flags a callback as "entirely Testing Library calls"
// whenever it finds no statement it can positively identify as non-Testing-Library.
// Its per-statement identifier extraction only understands a few shapes (a bare
// call, an awaited call, a return); any other shape (e.g. `await new Promise(...)`,
// used for a manual delay) is invisible to that check rather than counted as
// "non-Testing-Library", so a callback made entirely of such statements is
// flagged even though it contains no Testing Library call at all. Guard against
// this by independently confirming the callback contains at least one call that
// really does resolve to a Testing Library (or `react-dom/test-utils`) export.
// getFullyQualifiedName() renders scoped package names with a dot instead of
// a slash, e.g. `fireEvent.change` imported from '@testing-library/react'
// resolves to "@testing-library.react.fireEvent.change".
const RECOGNIZED_MODULE_PREFIXES = [
  '@testing-library.dom',
  '@testing-library.react',
  '@testing-library.user-event',
  'react-dom.test-utils',
];

function isRecognizedTestingLibraryCall(context: Rule.RuleContext, node: estree.Node): boolean {
  const fqn = getFullyQualifiedName(context, node);
  return (
    fqn != null &&
    RECOGNIZED_MODULE_PREFIXES.some(prefix => fqn === prefix || fqn.startsWith(`${prefix}.`))
  );
}

const SKIPPED_AST_KEYS = new Set(['parent', 'loc', 'range']);

function isNode(value: unknown): value is estree.Node {
  return !!value && typeof (value as estree.Node).type === 'string';
}

function childNodesOf(node: estree.Node): estree.Node[] {
  const children: estree.Node[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (SKIPPED_AST_KEYS.has(key)) {
      continue;
    }
    if (Array.isArray(value)) {
      children.push(...value.filter(isNode));
    } else if (isNode(value)) {
      children.push(value);
    }
  }
  return children;
}

function collectCallExpressions(
  node: estree.Node,
  results: estree.CallExpression[] = [],
): estree.CallExpression[] {
  if (node.type === 'CallExpression') {
    results.push(node);
  }
  for (const child of childNodesOf(node)) {
    collectCallExpressions(child, results);
  }
  return results;
}

function findEnclosingCallExpression(
  node: estree.Node & Rule.NodeParentExtension,
): (estree.CallExpression & Rule.NodeParentExtension) | undefined {
  let current: (estree.Node & Rule.NodeParentExtension) | undefined = node;
  while (current) {
    if (current.type === 'CallExpression') {
      return current as estree.CallExpression & Rule.NodeParentExtension;
    }
    current = current.parent as (estree.Node & Rule.NodeParentExtension) | undefined;
  }
  return undefined;
}

function actCallbackHasNoRecognizedTestingLibraryCall(
  context: Rule.RuleContext,
  reportedNode: estree.Node,
): boolean {
  const actCall = findEnclosingCallExpression(
    reportedNode as estree.Node & Rule.NodeParentExtension,
  );
  const callback = actCall?.arguments[0];
  if (
    !callback ||
    (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression')
  ) {
    // Cannot independently verify; do not second-guess the upstream rule.
    return false;
  }
  const calls = collectCallExpressions(callback.body);
  return !calls.some(call => isRecognizedTestingLibraryCall(context, call));
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...withStrictImportResolution(rule),
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (
        'messageId' in reportDescriptor &&
        reportDescriptor.messageId === EMPTY_CALLBACK_MESSAGE_ID
      ) {
        return;
      }
      if (
        'messageId' in reportDescriptor &&
        reportDescriptor.messageId === TESTING_LIBRARY_UTIL_MESSAGE_ID &&
        'node' in reportDescriptor &&
        actCallbackHasNoRecognizedTestingLibraryCall(context, reportDescriptor.node as estree.Node)
      ) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}
