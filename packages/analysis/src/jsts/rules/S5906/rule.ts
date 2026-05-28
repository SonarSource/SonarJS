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
// https://sonarsource.github.io/rspec/#/rspec/S5906/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { extractTestAssertion, type AssertionStyle } from '../helpers/assertions.js';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import {
  getBooleanExpressionSuggestion,
  getBooleanValue,
  isLengthAccess,
  isNaNExpression,
  isNullLiteral,
  isPlaywrightLocatorExpression,
  isUndefinedExpression,
  replacement,
  type Suggestion,
} from './assertion-suggestions.js';
import * as meta from './generated-meta.js';

const messages = {
  preferSpecificAssertion: 'Use a more specific assertion instead of this generic one.',
  suggestSpecificAssertion: 'Replace with "{{assertion}}".',
};

const PLAYWRIGHT_MODULES = ['@playwright/test'];
const MAX_ASSERT_ARGUMENTS_WITH_MESSAGE = 3;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const hasPlaywright = importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES);
    const playwrightLocators = new Set<string>();

    function report(node: estree.CallExpression, _suggestion: Suggestion) {
      context.report({
        node: node.callee,
        messageId: 'preferSpecificAssertion',
      });
    }

    return {
      CallExpression(node: estree.Node) {
        if (node.type !== 'CallExpression') {
          return;
        }
        if (hasPlaywright) {
          const playwrightSuggestion = getPlaywrightLocatorSuggestion(
            node,
            sourceCode,
            playwrightLocators,
          );
          if (playwrightSuggestion) {
            report(node, playwrightSuggestion);
            return;
          }
        }
        const assertion = extractTestAssertion(context, node);
        if (assertion?.kind !== 'comparison') {
          return;
        }
        const suggestion = getSuggestion(context, assertion.style, node, sourceCode);
        if (suggestion) {
          report(node, suggestion);
        }
      },
      VariableDeclarator(node: estree.Node) {
        if (
          hasPlaywright &&
          node.type === 'VariableDeclarator' &&
          isIdentifier(node.id) &&
          node.init &&
          isPlaywrightLocatorExpression(node.init, playwrightLocators)
        ) {
          playwrightLocators.add(node.id.name);
        }
      },
    };
  },
};

function getSuggestion(
  context: Rule.RuleContext,
  style: AssertionStyle,
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  switch (style) {
    case 'jest-like':
      return getJestLikeSuggestion(node, sourceCode);
    case 'chai-bdd':
      return getChaiBddSuggestion(node, sourceCode);
    case 'chai-assert':
      return getChaiAssertSuggestion(context, node, sourceCode);
    case 'cypress':
      return getCypressSuggestion(node, sourceCode);
    default:
      return null;
  }
}

function getJestLikeSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !['toBe', 'toEqual', 'toStrictEqual'].includes(node.callee.property.name)
  ) {
    return null;
  }
  const chain = getExpectChain(node.callee.object);
  if (!chain || node.arguments.length !== 1) {
    return null;
  }
  const { actual, negated } = chain;
  const expected = node.arguments[0];
  const actualText = sourceCode.getText(actual);
  const expectedText = sourceCode.getText(expected);
  const prefix = `expect(${actualText})${negated ? '.not' : ''}`;

  if (isNullLiteral(expected)) {
    return replacement(`${prefix}.toBeNull()`, node, sourceCode);
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      negated ? `expect(${actualText}).toBeDefined()` : `${prefix}.toBeUndefined()`,
      node,
      sourceCode,
    );
  }
  if (isNaNExpression(expected)) {
    return replacement(`${prefix}.toBeNaN()`, node, sourceCode);
  }
  if (isLengthAccess(actual) && !negated) {
    return replacement(
      `expect(${sourceCode.getText(actual.object)}).toHaveLength(${expectedText})`,
      node,
      sourceCode,
    );
  }
  const booleanExpected = getBooleanValue(expected);
  if (booleanExpected === undefined) {
    return null;
  }
  return getBooleanExpressionSuggestion(
    actual,
    booleanExpected !== negated,
    'jest',
    sourceCode,
    node,
  );
}

function getChaiBddSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  return getChaiExpectSuggestion(node, sourceCode) ?? getChaiShouldSuggestion(node, sourceCode);
}

function getChaiExpectSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !['equal', 'eql'].includes(node.callee.property.name) ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  const chain = getChaiExpectChain(node.callee.object);
  if (!chain) {
    return null;
  }
  return getChaiValueSuggestion(chain.actual, node.arguments[0], chain.negated, node, sourceCode);
}

function getChaiShouldSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !['equal', 'eql'].includes(node.callee.property.name) ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  const chain = getShouldChain(node.callee.object);
  if (!chain) {
    return null;
  }
  return getChaiValueSuggestion(chain.actual, node.arguments[0], chain.negated, node, sourceCode);
}

function getChaiAssertSuggestion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  const method = getAssertMethod(context, node);
  if (
    !method ||
    node.arguments.length < 2 ||
    node.arguments.length > MAX_ASSERT_ARGUMENTS_WITH_MESSAGE
  ) {
    return null;
  }
  const [actual, expected] = node.arguments;
  const negated = method.startsWith('not');
  if (!['strictEqual', 'notStrictEqual'].includes(method)) {
    return null;
  }
  const actualText = sourceCode.getText(actual);
  if (isNullLiteral(expected)) {
    return replacement(
      `assert.${negated ? 'isNotNull' : 'isNull'}(${actualText}${messageArgument(node, sourceCode)})`,
      node,
      sourceCode,
    );
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `assert.${negated ? 'isDefined' : 'isUndefined'}(${actualText}${messageArgument(node, sourceCode)})`,
      node,
      sourceCode,
    );
  }
  return null;
}

function getChaiValueSuggestion(
  actual: estree.Node,
  expected: estree.Node,
  negated: boolean,
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  const actualText = sourceCode.getText(actual);
  if (isNullLiteral(expected)) {
    return replacement(
      `expect(${actualText}).to${negated ? '.not' : ''}.be.null`,
      node,
      sourceCode,
    );
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `expect(${actualText}).to${negated ? '.not' : ''}.be.undefined`,
      node,
      sourceCode,
    );
  }
  if (isLengthAccess(actual) && !negated) {
    return replacement(
      `expect(${sourceCode.getText(actual.object)}).to.have.lengthOf(${sourceCode.getText(expected)})`,
      node,
      sourceCode,
    );
  }
  const booleanExpected = getBooleanValue(expected);
  if (booleanExpected === undefined) {
    return null;
  }
  return getBooleanExpressionSuggestion(
    actual,
    booleanExpected !== negated,
    'chai',
    sourceCode,
    node,
  );
}

function getCypressSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !['should', 'and'].includes(node.callee.property.name) ||
    node.arguments.length < 2
  ) {
    return null;
  }
  if (!isCyWrapCall(node.callee.object) || node.arguments[0].type !== 'Literal') {
    return null;
  }
  const chainer = node.arguments[0].value;
  if (chainer !== 'equal' && chainer !== 'not.equal' && chainer !== 'deep.equal') {
    return null;
  }
  const expected = node.arguments[1];
  if (isNullLiteral(expected)) {
    return replacement(
      `${sourceCode.getText(node.callee.object)}.${node.callee.property.name}('${chainer === 'not.equal' ? 'not.be.null' : 'be.null'}')`,
      node,
      sourceCode,
    );
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `${sourceCode.getText(node.callee.object)}.${node.callee.property.name}('${chainer === 'not.equal' ? 'not.be.undefined' : 'be.undefined'}')`,
      node,
      sourceCode,
    );
  }
  return null;
}

function getPlaywrightLocatorSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
  locatorNames: ReadonlySet<string>,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !['toBe', 'toEqual'].includes(node.callee.property.name) ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  const chain = getExpectChain(node.callee.object);
  if (!chain || chain.negated || chain.actual.type !== 'AwaitExpression') {
    return null;
  }
  const awaited = chain.actual.argument;
  if (
    awaited.type !== 'CallExpression' ||
    !isMethodCall(awaited) ||
    awaited.arguments.length !== 0
  ) {
    return null;
  }
  if (!isPlaywrightLocatorExpression(awaited.callee.object, locatorNames)) {
    return null;
  }
  const locator = sourceCode.getText(awaited.callee.object);
  const expected = node.arguments[0];
  if (isIdentifier(awaited.callee.property, 'isVisible') && getBooleanValue(expected) === true) {
    return { assertion: `await expect(${locator}).toBeVisible()` };
  }
  if (isIdentifier(awaited.callee.property, 'count')) {
    return { assertion: `await expect(${locator}).toHaveCount(${sourceCode.getText(expected)})` };
  }
  if (isIdentifier(awaited.callee.property, 'inputValue')) {
    return { assertion: `await expect(${locator}).toHaveValue(${sourceCode.getText(expected)})` };
  }
  return null;
}

function getExpectChain(node: estree.Node): { actual: estree.Node; negated: boolean } | null {
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'not')) {
    const chain = getExpectChain(node.object);
    return chain ? { ...chain, negated: !chain.negated } : null;
  }
  if (
    node.type !== 'CallExpression' ||
    !isIdentifier(node.callee, 'expect') ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  return { actual: node.arguments[0], negated: false };
}

function getChaiExpectChain(node: estree.Node): { actual: estree.Node; negated: boolean } | null {
  let current = node;
  let negated = false;
  while (
    current.type === 'MemberExpression' &&
    !current.computed &&
    current.property.type === 'Identifier'
  ) {
    if (current.property.name === 'not') {
      negated = !negated;
    }
    current = current.object;
  }
  if (
    current.type !== 'CallExpression' ||
    !isIdentifier(current.callee, 'expect') ||
    current.arguments.length !== 1
  ) {
    return null;
  }
  return { actual: current.arguments[0], negated };
}

function getShouldChain(node: estree.Node): { actual: estree.Node; negated: boolean } | null {
  let current = node;
  let negated = false;
  while (
    current.type === 'MemberExpression' &&
    !current.computed &&
    current.property.type === 'Identifier'
  ) {
    if (current.property.name === 'not') {
      negated = !negated;
    }
    if (current.property.name === 'should') {
      return { actual: current.object, negated };
    }
    current = current.object;
  }
  return null;
}

function getAssertMethod(context: Rule.RuleContext, node: estree.CallExpression): string | null {
  if (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier'
  ) {
    const object = node.callee.object;
    if (
      isIdentifier(object, 'assert') ||
      (object.type === 'MemberExpression' && isIdentifier(object.property, 'assert'))
    ) {
      return node.callee.property.name;
    }
    const fqn = getFullyQualifiedName(context, node.callee);
    if (fqn?.startsWith('chai.assert.')) {
      return node.callee.property.name;
    }
  }
  return null;
}

function isCyWrapCall(node: estree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    isMethodCall(node) &&
    isIdentifier(node.callee.property, 'wrap') &&
    isIdentifier(node.callee.object, 'cy')
  );
}

function messageArgument(node: estree.CallExpression, sourceCode: SourceCode): string {
  return node.arguments[2] ? `, ${sourceCode.getText(node.arguments[2])}` : '';
}
