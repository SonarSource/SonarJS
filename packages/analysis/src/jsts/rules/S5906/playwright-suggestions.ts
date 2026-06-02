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

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import {
  getBooleanValue,
  isPlaywrightLocatorExpression,
  type Suggestion,
} from './assertion-suggestions.js';
import { getExpectChain } from './expect-chain.js';

const PLAYWRIGHT_BOOLEAN_GETTERS = new Map<string, { truthy: string; falsy: string }>([
  ['isVisible', { truthy: 'toBeVisible', falsy: 'toBeHidden' }],
  ['isHidden', { truthy: 'toBeHidden', falsy: 'toBeVisible' }],
  ['isEnabled', { truthy: 'toBeEnabled', falsy: 'toBeDisabled' }],
  ['isDisabled', { truthy: 'toBeDisabled', falsy: 'toBeEnabled' }],
  ['isChecked', { truthy: 'toBeChecked', falsy: 'not.toBeChecked' }],
]);

const PLAYWRIGHT_VALUE_GETTERS = new Map<string, string>([
  ['count', 'toHaveCount'],
  ['inputValue', 'toHaveValue'],
]);

export function getPlaywrightLocatorSuggestion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  sourceCode: SourceCode,
  locatorVariables: ReadonlySet<Scope.Variable>,
): Suggestion | null {
  const chain = getPlaywrightAssertionChain(context, node);
  if (!chain) {
    return null;
  }

  const { getter, locator, negated } = chain;
  if (!isPlaywrightLocatorExpression(context, locator, locatorVariables)) {
    return null;
  }

  return (
    getBooleanGetterSuggestion(getter, locator, node.arguments[0], negated, sourceCode) ??
    getValueGetterSuggestion(getter, locator, node.arguments[0], negated, sourceCode)
  );
}

function getPlaywrightAssertionChain(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): { getter: estree.CallExpression; locator: estree.Node; negated: boolean } | null {
  if (
    !isMethodCall(node) ||
    !['toBe', 'toEqual', 'toStrictEqual'].includes(node.callee.property.name) ||
    node.arguments.length !== 1
  ) {
    return null;
  }

  if (!isPlaywrightExpect(context, node.callee.object)) {
    return null;
  }

  const chain = getExpectChain(node.callee.object);
  const awaited = chain?.actual.type === 'AwaitExpression' ? chain.actual.argument : undefined;
  if (!chain || awaited?.type !== 'CallExpression' || !isMethodCall(awaited)) {
    return null;
  }
  if (awaited.arguments.length !== 0) {
    return null;
  }
  return { getter: awaited, locator: awaited.callee.object, negated: chain.negated };
}

function isPlaywrightExpect(context: Rule.RuleContext, node: estree.Node): boolean {
  const expectCall = getExpectCall(node);
  return (
    expectCall !== null &&
    getFullyQualifiedName(context, expectCall.callee) === '@playwright.test.expect'
  );
}

function getExpectCall(node: estree.Node): estree.CallExpression | null {
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'not')) {
    return getExpectCall(node.object);
  }
  if (node.type === 'CallExpression' && isIdentifier(node.callee, 'expect')) {
    return node;
  }
  return null;
}

function getBooleanGetterSuggestion(
  getter: estree.CallExpression,
  locator: estree.Node,
  expected: estree.Node,
  negated: boolean,
  sourceCode: SourceCode,
): Suggestion | null {
  if (!isMethodCall(getter)) {
    return null;
  }

  const matcher = PLAYWRIGHT_BOOLEAN_GETTERS.get(getter.callee.property.name);
  const expectedBoolean = getBooleanValue(expected);
  if (!matcher || expectedBoolean === undefined) {
    return null;
  }

  const method = expectedBoolean === negated ? matcher.falsy : matcher.truthy;
  return { assertion: `await expect(${sourceCode.getText(locator)}).${method}()` };
}

function getValueGetterSuggestion(
  getter: estree.CallExpression,
  locator: estree.Node,
  expected: estree.Node,
  negated: boolean,
  sourceCode: SourceCode,
): Suggestion | null {
  if (!isMethodCall(getter)) {
    return null;
  }

  const matcher = PLAYWRIGHT_VALUE_GETTERS.get(getter.callee.property.name);
  if (!matcher) {
    return null;
  }

  return {
    assertion: `await expect(${sourceCode.getText(locator)}).${negated ? 'not.' : ''}${matcher}(${sourceCode.getText(expected)})`,
  };
}
