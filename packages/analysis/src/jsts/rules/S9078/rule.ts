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
// https://sonarsource.github.io/rspec/#/rspec/S9078/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { FUNCTION_NODES, getUniqueWriteReference, getVariableFromScope } from '../helpers/ast.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getMochaCalleeParts, hasCallback } from '../helpers/mocha-style-test-frameworks.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const messages = {
  duplicate:
    'Remove this duplicate parameterized test case matching index {{index}}, adding a redundant execution.',
} as const;

const JEST_IMPORTS = ['jest', '@jest/globals'];
const JEST_DEPENDENCIES = ['jest'];
const VITEST_MODULES = ['vitest'];
const BUN_MODULES = ['bun:test'];
const BUN_FQN_PREFIX = 'bun:test.';
const JEST_GLOBALS_FQN_PREFIX = '@jest.globals.';
const COMMON_MODIFIERS = new Set(['only', 'concurrent']);
const JEST_TEST_MODIFIERS = new Set(['failing']);
const VITEST_MODIFIERS = new Set(['fails', 'sequential']);
const TESTS = new Set(['test', 'it']);
const SUITES = new Set(['describe', 'suite']);
const BUN_CONSTRUCTS = new Set(['test', 'describe']);

type Framework = 'bun' | 'jest' | 'vitest';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, fixable: 'code' }),

  create(context: Rule.RuleContext) {
    const activeFrameworks = {
      bun: importsOrDependsOnModule(context, BUN_MODULES, BUN_MODULES),
      jest: importsOrDependsOnModule(context, JEST_IMPORTS, JEST_DEPENDENCIES),
      vitest: importsOrDependsOnModule(context, VITEST_MODULES, VITEST_MODULES),
    };

    if (!Object.values(activeFrameworks).some(Boolean)) {
      return {};
    }

    return {
      CallExpression(node: estree.CallExpression) {
        const dataset = getDataset(node);
        if (
          dataset === undefined ||
          !hasSupportedCallback(context, node) ||
          !isSupportedDeclaration(context, node, activeFrameworks)
        ) {
          return;
        }

        reportDuplicateRows(context, dataset);
      },
    };
  },
};

function reportDuplicateRows(context: Rule.RuleContext, dataset: estree.ArrayExpression): void {
  const previousRows: { index: number; node: estree.Node }[] = [];
  const duplicateRows: { index: number; node: estree.Node; matchingIndex: number }[] = [];

  dataset.elements.forEach((element, index) => {
    if (element === null || element.type === 'SpreadElement') {
      return;
    }

    const previous = previousRows.find(row => areEquivalent(row.node, element, context.sourceCode));
    if (previous === undefined) {
      previousRows.push({ index, node: element });
      return;
    }

    duplicateRows.push({ index, node: element, matchingIndex: previous.index });
  });

  duplicateRows.forEach((duplicate, duplicatePosition) => {
    const previousDuplicate = duplicateRows[duplicatePosition - 1];
    const isFirstInConsecutiveRun = previousDuplicate?.index !== duplicate.index - 1;
    let lastDuplicate = duplicate;
    if (isFirstInConsecutiveRun) {
      for (let nextPosition = duplicatePosition + 1; ; nextPosition++) {
        const nextDuplicate = duplicateRows[nextPosition];
        if (nextDuplicate?.index !== lastDuplicate.index + 1) {
          break;
        }
        lastDuplicate = nextDuplicate;
      }
    }

    context.report({
      node: duplicate.node,
      messageId: 'duplicate',
      data: { index: duplicate.matchingIndex },
      fix: fixer =>
        removeDuplicateRow(fixer, context.sourceCode, duplicate.node, lastDuplicate.node),
    });
  });
}

function removeDuplicateRow(
  fixer: Rule.RuleFixer,
  sourceCode: Rule.RuleContext['sourceCode'],
  firstElement: estree.Node,
  lastElement: estree.Node,
): Rule.Fix {
  const previousToken = sourceCode.getTokenBefore(firstElement);
  const start = previousToken?.value === ',' ? previousToken.range[0] : firstElement.range![0];
  return fixer.removeRange([start, lastElement.range![1]]);
}

function hasSupportedCallback(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  if (hasCallback(node)) {
    return true;
  }

  const callback = node.arguments[1];
  if (callback?.type !== 'Identifier') {
    return false;
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(callback), callback.name);
  if (variable?.defs.length !== 1) {
    return false;
  }

  const [definition] = variable.defs;
  if (definition.type === 'FunctionName') {
    return !variable.references.some(reference => reference.isWrite());
  }
  if (definition.type !== 'Variable') {
    return false;
  }

  const initializer = definition.node.init;
  return (
    initializer != null &&
    FUNCTION_NODES.includes(initializer.type) &&
    getUniqueWriteReference(variable) === initializer
  );
}

function getDataset(node: estree.CallExpression): estree.ArrayExpression | undefined {
  if (node.callee.type !== 'CallExpression') {
    return undefined;
  }

  const { callee, arguments: args } = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'each' ||
    args.length === 0
  ) {
    return undefined;
  }

  const [dataset] = args;
  if (dataset === undefined || dataset.type === 'SpreadElement') {
    return undefined;
  }

  const unwrapped = unwrapTypeScriptExpression(dataset);
  return unwrapped.type === 'ArrayExpression' ? unwrapped : undefined;
}

function isSupportedDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  activeFrameworks: Record<Framework, boolean>,
): boolean {
  const parts = getMochaCalleeParts(node.callee);
  if (parts?.modifiers.at(-1) !== 'each') {
    return false;
  }

  const name = getConstructName(context, parts.base);
  if (name === undefined || (!TESTS.has(name) && !SUITES.has(name))) {
    return false;
  }

  const framework = getFramework(context, parts.base, activeFrameworks);
  if (
    framework === undefined ||
    (name === 'suite' && framework !== 'vitest') ||
    (framework === 'bun' && !BUN_CONSTRUCTS.has(name))
  ) {
    return false;
  }

  const modifiers = parts.modifiers.slice(0, -1);
  return modifiers.every(modifier => isRunnableModifier(modifier, name, framework));
}

function getConstructName(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): string | undefined {
  const fqn = getFullyQualifiedName(context, identifier);
  if (fqn?.startsWith(BUN_FQN_PREFIX)) {
    return fqn.slice(BUN_FQN_PREFIX.length);
  }
  if (fqn?.startsWith(JEST_GLOBALS_FQN_PREFIX)) {
    return fqn.slice(JEST_GLOBALS_FQN_PREFIX.length);
  }
  if (fqn?.startsWith('jest.')) {
    return fqn.slice('jest.'.length);
  }
  if (fqn?.startsWith('vitest.')) {
    return fqn.slice('vitest.'.length);
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  return variable == null || variable.defs.length === 0 ? identifier.name : undefined;
}

function getFramework(
  context: Rule.RuleContext,
  base: estree.Identifier,
  activeFrameworks: Record<Framework, boolean>,
): Framework | undefined {
  const fqn = getFullyQualifiedName(context, base);
  if (fqn?.startsWith(BUN_FQN_PREFIX)) {
    return 'bun';
  }
  if (fqn?.startsWith('vitest.')) {
    return 'vitest';
  }
  if (fqn?.startsWith('jest.') || fqn?.startsWith(JEST_GLOBALS_FQN_PREFIX)) {
    return 'jest';
  }
  if (base.name === 'suite') {
    return activeFrameworks.vitest ? 'vitest' : undefined;
  }

  const active = (Object.entries(activeFrameworks) as [Framework, boolean][]).filter(
    ([, isActive]) => isActive,
  );
  return active.length === 1 ? active[0][0] : undefined;
}

function isRunnableModifier(modifier: string, name: string, framework: Framework): boolean {
  if (COMMON_MODIFIERS.has(modifier)) {
    return framework !== 'bun' || modifier === 'only';
  }
  if (!TESTS.has(name)) {
    return framework === 'vitest' && modifier === 'sequential';
  }
  return (
    (framework === 'jest' && JEST_TEST_MODIFIERS.has(modifier)) ||
    (framework === 'vitest' && VITEST_MODIFIERS.has(modifier))
  );
}

function unwrapTypeScriptExpression(node: estree.Node): estree.Node {
  let unwrapped = node as unknown as TSESTree.Node;
  while (
    unwrapped.type === 'TSNonNullExpression' ||
    unwrapped.type === 'TSAsExpression' ||
    unwrapped.type === 'TSSatisfiesExpression' ||
    unwrapped.type === 'TSTypeAssertion'
  ) {
    unwrapped = unwrapped.expression;
  }
  return unwrapped as unknown as estree.Node;
}
