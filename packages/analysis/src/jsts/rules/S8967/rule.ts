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
// https://sonarsource.github.io/rspec/#/rspec/S8967/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getVariableFromName, isIdentifier, isMethodCall } from '../helpers/ast.js';
import { collectCallChain, getRootCall } from '../helpers/expect-call-chain.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const messages = {
  removeInterpolation: 'Remove this interpolation from the inline snapshot.',
};

const JEST_MODULES = ['jest', '@jest/globals'];
const VITEST_MODULES = ['vitest'];
const INLINE_SNAPSHOT_MATCHERS = new Set([
  'toMatchInlineSnapshot',
  'toThrowErrorMatchingInlineSnapshot',
]);
const ALLOWED_EXPECT_MODIFIERS = new Set(['not', 'resolves', 'rejects']);

type Frameworks = {
  jest: boolean;
  vitest: boolean;
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const frameworks = {
      jest: importsOrDependsOnModule(context, JEST_MODULES, ['jest']),
      vitest: importsOrDependsOnModule(context, VITEST_MODULES, VITEST_MODULES),
    };

    if (!frameworks.jest && !frameworks.vitest) {
      return {};
    }

    return {
      CallExpression(node: estree.Node) {
        if (node.type !== 'CallExpression') {
          return;
        }

        const snapshot = getInterpolatedInlineSnapshot(context, node, frameworks);
        if (snapshot) {
          context.report({
            node: snapshot,
            messageId: 'removeInterpolation',
          });
        }
      },
    };
  },
};

function getInterpolatedInlineSnapshot(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
): estree.TemplateLiteral | null {
  if (!isMethodCall(call) || !INLINE_SNAPSHOT_MATCHERS.has(call.callee.property.name)) {
    return null;
  }

  if (!isBuiltInInlineSnapshotAssertion(context, call, frameworks)) {
    return null;
  }

  const snapshot = call.arguments.at(-1);
  return snapshot?.type === 'TemplateLiteral' && snapshot.expressions.length > 0 ? snapshot : null;
}

function isBuiltInInlineSnapshotAssertion(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
): boolean {
  const root = getRootCall(call);
  if (root === null || !isExpectCall(context, root, frameworks)) {
    return false;
  }

  const { segments, complete } = collectCallChain(call);
  if (!complete) {
    return false;
  }

  const chain = segments.map(segment => segment.name);
  if (isMethodCall(root) && root.callee.property.name === 'expect') {
    chain.pop();
  }

  return (
    chain.length > 0 &&
    INLINE_SNAPSHOT_MATCHERS.has(chain[0]) &&
    chain.slice(1).every(segment => ALLOWED_EXPECT_MODIFIERS.has(segment))
  );
}

function isExpectCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
): boolean {
  const fqn = getFullyQualifiedName(context, call.callee);
  if (fqn) {
    return fqn === '@jest.globals.expect' || fqn === 'vitest.expect';
  }

  return (
    (frameworks.jest || frameworks.vitest) &&
    isIdentifier(call.callee, 'expect') &&
    isGlobalExpect(context, call.callee)
  );
}

function isGlobalExpect(context: Rule.RuleContext, node: estree.Identifier): boolean {
  const variable = getVariableFromName(context, node.name, node);
  return !variable || variable.defs.length === 0;
}
