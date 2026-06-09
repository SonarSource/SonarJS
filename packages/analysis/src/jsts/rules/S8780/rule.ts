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
// https://sonarsource.github.io/rspec/#/rspec/S8780/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { isIdentifier } from '../helpers/ast.js';
import { extractTestCase } from '../helpers/mocha.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const messages = {
  awaitOrReturn: 'Await or return this async assertion.',
};

const JEST_MODULES = ['jest', '@jest/globals'];
const VITEST_MODULES = ['vitest'];
const JASMINE_MODULES = ['jasmine'];
const JASMINE_DEPENDENCIES = ['jasmine', 'jasmine-core', 'jasmine-node', 'karma-jasmine'];
const PLAYWRIGHT_MODULES = ['@playwright/test'];

const TEST_FUNCTION_NAMES = new Set([
  'it',
  'it.only',
  'it.skip',
  'test',
  'test.only',
  'test.skip',
  'specify',
  'specify.only',
  'specify.skip',
  'vitest.it',
  'vitest.it.only',
  'vitest.it.skip',
  'vitest.test',
  'vitest.test.only',
  'vitest.test.skip',
  '@playwright.test.test',
  '@playwright.test.test.only',
  '@playwright.test.test.skip',
]);

const PLAYWRIGHT_ASYNC_MATCHERS = new Set([
  'toBeAttached',
  'toBeChecked',
  'toBeDisabled',
  'toBeEditable',
  'toBeEmpty',
  'toBeEnabled',
  'toBeFocused',
  'toBeHidden',
  'toBeInViewport',
  'toBeOK',
  'toBeVisible',
  'toContainText',
  'toHaveAttribute',
  'toHaveClass',
  'toHaveCount',
  'toHaveCSS',
  'toHaveId',
  'toHaveJSProperty',
  'toHaveScreenshot',
  'toHaveText',
  'toHaveTitle',
  'toHaveURL',
  'toHaveValue',
  'toHaveValues',
]);

type Frameworks = {
  jest: boolean;
  vitest: boolean;
  jasmine: boolean;
  playwright: boolean;
};

type FunctionArgument = estree.FunctionExpression | estree.ArrowFunctionExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),

  create(context: Rule.RuleContext) {
    const frameworks = {
      jest: importsOrDependsOnModule(context, JEST_MODULES, ['jest']),
      vitest: importsOrDependsOnModule(context, VITEST_MODULES, VITEST_MODULES),
      jasmine: importsOrDependsOnModule(context, JASMINE_MODULES, JASMINE_DEPENDENCIES),
      playwright: importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES),
    };

    if (!Object.values(frameworks).some(Boolean)) {
      return {};
    }

    return {
      'CallExpression:exit'(node: estree.Node) {
        const call = node as estree.CallExpression;
        const callback = extractSupportedTestCallback(context, call);
        if (!callback) {
          return;
        }

        if (callback.body.type !== 'BlockStatement') {
          return;
        }

        for (const statement of callback.body.body) {
          if (statement.type !== 'ExpressionStatement') {
            continue;
          }

          const assertionNode = getAsyncAssertionNode(context, statement.expression, frameworks);
          if (assertionNode) {
            context.report({
              node: assertionNode,
              messageId: 'awaitOrReturn',
            });
          }
        }
      },
    };
  },
};

function extractSupportedTestCallback(
  context: Rule.RuleContext,
  call: estree.CallExpression,
): estree.Function | null {
  const mochaTestCase = extractTestCase(call);
  if (mochaTestCase) {
    return isFunctionArgument(mochaTestCase.callback) ? mochaTestCase.callback : null;
  }

  const name = getFullyQualifiedName(context, call.callee) ?? getDottedName(call.callee);
  if (!name || !TEST_FUNCTION_NAMES.has(name)) {
    return null;
  }

  for (const argument of call.arguments) {
    if (isFunctionArgument(argument)) {
      return argument;
    }
  }
  return null;
}

function isFunctionArgument(node: estree.Node | estree.SpreadElement): node is FunctionArgument {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function getAsyncAssertionNode(
  context: Rule.RuleContext,
  expression: estree.Expression,
  frameworks: Frameworks,
): estree.Node | null {
  const unwrapped = unwrapChainExpression(expression);
  if (unwrapped.type === 'AwaitExpression') {
    return null;
  }
  if (unwrapped.type !== 'CallExpression') {
    return null;
  }

  return (
    getJestOrVitestAsyncNode(context, unwrapped, frameworks) ??
    getJasmineAsyncNode(context, unwrapped, frameworks) ??
    getPlaywrightAsyncNode(context, unwrapped, frameworks)
  );
}

function getJestOrVitestAsyncNode(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
): estree.Node | null {
  if (!frameworks.jest && !frameworks.vitest) {
    return null;
  }

  const chain = collectCallChain(call);
  const asyncSegment = chain.find(
    segment => segment.name === 'resolves' || segment.name === 'rejects',
  );
  if (!asyncSegment) {
    return null;
  }

  const root = getRootCall(call);
  if (!root || !isExpectCall(context, root, frameworks, false)) {
    return null;
  }

  return asyncSegment.node;
}

function getJasmineAsyncNode(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
): estree.Node | null {
  if (!frameworks.jasmine) {
    return null;
  }

  const root = getRootCall(call);
  if (root && isNamedCall(context, root, 'expectAsync', ['jasmine.expectAsync'])) {
    return root.callee;
  }

  return null;
}

function getPlaywrightAsyncNode(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
): estree.Node | null {
  if (!frameworks.playwright || call.callee.type !== 'MemberExpression' || call.callee.computed) {
    return null;
  }

  const matcher = call.callee.property;
  if (!isIdentifier(matcher) || !PLAYWRIGHT_ASYNC_MATCHERS.has(matcher.name)) {
    return null;
  }

  const root = getRootCall(call);
  if (root && isExpectCall(context, root, frameworks, true)) {
    return matcher;
  }

  return null;
}

function collectCallChain(call: estree.CallExpression): { name: string; node: estree.Node }[] {
  const chain: { name: string; node: estree.Node }[] = [];
  let current: estree.Node | estree.Super = call;

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    if (current.type === 'CallExpression') {
      current = unwrapChainExpression(current.callee);
      continue;
    }

    if (current.computed || !isIdentifier(current.property)) {
      break;
    }

    chain.push({ name: current.property.name, node: current.property });
    current = unwrapChainExpression(current.object);
  }

  return chain;
}

function getRootCall(call: estree.CallExpression): estree.CallExpression | null {
  let current: estree.Node | estree.Super = call;

  while (current.type === 'CallExpression' || current.type === 'MemberExpression') {
    if (current.type === 'CallExpression') {
      const callee: estree.Expression | estree.Super = unwrapChainExpression(current.callee);
      if (callee.type !== 'MemberExpression') {
        return current;
      }
      current = callee;
      continue;
    }

    current = unwrapChainExpression(current.object);
  }

  return null;
}

function isExpectCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  frameworks: Frameworks,
  playwrightOnly: boolean,
): boolean {
  const fqn = getFullyQualifiedName(context, call.callee);
  if (fqn) {
    return playwrightOnly
      ? fqn === '@playwright.test.expect'
      : fqn === 'expect' ||
          fqn === '@jest.globals.expect' ||
          fqn === 'vitest.expect' ||
          (frameworks.jest && isIdentifier(call.callee, 'expect')) ||
          (frameworks.vitest && isIdentifier(call.callee, 'expect'));
  }

  return !playwrightOnly && isIdentifier(call.callee, 'expect');
}

function isNamedCall(
  context: Rule.RuleContext,
  call: estree.CallExpression,
  globalName: string,
  importedNames: string[],
): boolean {
  const fqn = getFullyQualifiedName(context, call.callee);
  return importedNames.includes(fqn ?? '') || isIdentifier(call.callee, globalName);
}

function unwrapChainExpression<T extends estree.Node | estree.Super>(node: T): T | estree.Expression {
  return node.type === 'ChainExpression' ? node.expression : node;
}

function getDottedName(node: estree.Node): string | null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type !== 'MemberExpression' || node.computed || !isIdentifier(node.property)) {
    return null;
  }
  const objectName = getDottedName(node.object);
  return objectName ? `${objectName}.${node.property.name}` : null;
}
