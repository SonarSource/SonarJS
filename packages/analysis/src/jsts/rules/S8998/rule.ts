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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S8998/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { getVariableFromScope } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getMochaCalleeParts,
  getMochaConstructName,
  hasCallback,
} from '../helpers/mocha-style-test-frameworks.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const messages = {
  emptyDataset: 'This parameterized test has no cases, so its body never runs.',
} as const;

const JEST_IMPORTS = ['jest', '@jest/globals'];
const JEST_DEPENDENCIES = ['jest'];
const VITEST_MODULES = ['vitest'];
const BUN_MODULES = ['bun:test'];
const COMMON_MODIFIERS = new Set(['only', 'concurrent']);
const JEST_TEST_MODIFIERS = new Set(['failing']);
const VITEST_MODIFIERS = new Set(['fails', 'sequential']);
const TESTS = new Set(['test', 'it']);
const SUITES = new Set(['describe', 'suite']);
const BUN_CONSTRUCTS = new Set(['test', 'describe']);

type Framework = 'bun' | 'jest' | 'vitest';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
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
          !hasCallback(node) ||
          node.arguments.length < 2 ||
          !isSupportedDeclaration(context, node, activeFrameworks)
        ) {
          return;
        }

        if (isEmptyArray(dataset) || isKnownEmptyDataset(context, dataset)) {
          context.report({ messageId: 'emptyDataset', node: dataset });
        }
      },
    };
  },
};

function getDataset(node: estree.CallExpression): estree.Expression | undefined {
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
  return dataset?.type === 'SpreadElement' ? undefined : dataset;
}

function isSupportedDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  activeFrameworks: Record<Framework, boolean>,
): boolean {
  const parts = getMochaCalleeParts(node.callee);
  if (parts === undefined || parts.modifiers.at(-1) !== 'each') {
    return false;
  }

  const name = getMochaConstructName(context, parts.base);
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

function getFramework(
  context: Rule.RuleContext,
  base: estree.Identifier,
  activeFrameworks: Record<Framework, boolean>,
): Framework | undefined {
  const fqn = getFullyQualifiedName(context, base);
  if (fqn?.startsWith('bun:test.')) {
    return 'bun';
  }
  if (fqn?.startsWith('vitest.')) {
    return 'vitest';
  }
  if (fqn?.startsWith('jest.') || fqn?.startsWith('@jest.globals.')) {
    return 'jest';
  }
  if (base.name === 'suite') {
    return activeFrameworks.vitest ? 'vitest' : undefined;
  }
  const active = (Object.entries(activeFrameworks) as [Framework, boolean][]).filter(
    ([, isActive]) => isActive,
  );
  if (active.length !== 1) {
    return undefined;
  }
  return active[0][0];
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

function isEmptyArray(node: estree.Node | null): node is estree.ArrayExpression {
  return node?.type === 'ArrayExpression' && node.elements.length === 0;
}

function isKnownEmptyDataset(context: Rule.RuleContext, dataset: estree.Expression): boolean {
  if (dataset.type !== 'Identifier') {
    return false;
  }

  const scope = context.sourceCode.getScope(dataset);
  const variable = getVariableFromScope(scope, dataset.name);
  if (variable === undefined || variable.scope !== scope) {
    return false;
  }

  const datasetStart = dataset.range?.[0];
  if (datasetStart === undefined) {
    return false;
  }

  const writes = variable.references.filter(reference => {
    const writeStart = reference.identifier.range?.[0];
    return (
      reference.isWrite() &&
      (writeStart === undefined ||
        writeStart < datasetStart ||
        reference.from.variableScope !== variable.scope.variableScope)
    );
  });
  if (writes.length !== 1 || !isEmptyArray(writes[0].writeExpr)) {
    return false;
  }

  return hasNoInterveningReference(variable, writes[0], dataset);
}

function hasNoInterveningReference(
  variable: Scope.Variable,
  write: Scope.Reference,
  dataset: estree.Identifier,
): boolean {
  const writeStart = write.identifier.range?.[0];
  const datasetStart = dataset.range?.[0];
  if (writeStart === undefined || datasetStart === undefined || writeStart >= datasetStart) {
    return false;
  }

  return !variable.references.some(reference => {
    const start = reference.identifier.range?.[0];
    return (
      reference !== write &&
      reference.identifier !== dataset &&
      (reference.from.variableScope !== variable.scope.variableScope ||
        (start !== undefined && writeStart < start && start < datasetStart))
    );
  });
}
