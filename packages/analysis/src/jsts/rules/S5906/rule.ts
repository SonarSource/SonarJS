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

import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { minVersion } from 'semver';
import { extractTestAssertion, type AssertionStyle } from '../helpers/assertions.js';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import { getDependenciesSanitizePaths } from '../helpers/dependency-manifests/dependencies.js';
import {
  getFullyQualifiedName,
  importsModule,
  importsOrDependsOnModule,
} from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { chaiShouldReceiver, getBooleanExpressionSuggestion } from './assertion-suggestions.js';
import {
  getBooleanValue,
  isLengthAccess,
  isNaNExpression,
  isNullLiteral,
  isUndefinedExpression,
  replacement,
  trackPlaywrightLocators,
  type Suggestion,
} from './assertion-utils.js';
import { getCypressSuggestion } from './cypress-suggestions.js';
import { getExpectChain } from './expect-chain.js';
import * as meta from './generated-meta.js';
import { getPlaywrightLocatorSuggestion } from './playwright-suggestions.js';

const messages = {
  preferSpecificAssertion:
    'Prefer "{{assertion}}" over this generic assertion; dedicated matchers read better and report clearer failures.',
  preferSpecificLengthAssertion:
    'Prefer "{{assertion}}" over this generic assertion for better reporting; it works on any object with a numeric length property.',
  quickfix: 'Replace with {{assertion}}.',
};

const PLAYWRIGHT_MODULES = ['@playwright/test'];
const JEST_LIKE_MODULES = ['vitest', 'bun:test', '@jest/globals'];
const JEST_LIKE_GLOBAL_MODULES = ['jest'];
const JASMINE_MODULES = ['jasmine'];
const JASMINE_GLOBAL_MODULES = ['jasmine', 'jasmine-core', 'jasmine-node', 'karma-jasmine'];
const MAX_ASSERT_ARGUMENTS_WITH_MESSAGE = 3;
const CHAI_EQUALITY_MATCHERS = new Set(['equal', 'equals', 'eq', 'eql', 'eqls']);
const JASMINE_SIZE_DEPENDENCIES = ['jasmine-core', 'jasmine'];
const JASMINE_TO_HAVE_SIZE_MIN_VERSION = '3.6.0';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const hasPlaywright = importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES);
    const jasmineSupportsToHaveSize = supportsJasmineToHaveSize(context);
    const hasAmbiguousJasmineJestGlobalExpect = hasAmbiguousJasmineJestGlobalExpectSignal(context);
    const playwrightLocators = new Set<Scope.Variable>();

    function report(node: estree.CallExpression, suggestion: Suggestion) {
      const replacementText = suggestion.replacement;
      const suggest = replacementText
        ? [
            {
              messageId: 'quickfix',
              data: { assertion: suggestion.assertion },
              fix: (fixer: Rule.RuleFixer) => fixer.replaceText(node, replacementText),
            },
          ]
        : undefined;

      context.report({
        node: node.callee,
        messageId: suggestion.messageId ?? 'preferSpecificAssertion',
        data: { assertion: suggestion.assertion },
        ...(suggest ? { suggest } : {}),
      });
    }

    return {
      ...(hasPlaywright ? trackPlaywrightLocators(context, playwrightLocators) : {}),
      CallExpression(node: estree.Node) {
        if (node.type !== 'CallExpression') {
          return;
        }
        if (hasPlaywright) {
          const playwrightSuggestion = getPlaywrightLocatorSuggestion(
            context,
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
        const suggestion = getSuggestion(
          context,
          assertion.style,
          node,
          sourceCode,
          jasmineSupportsToHaveSize,
          hasAmbiguousJasmineJestGlobalExpect,
        );
        if (suggestion) {
          report(node, suggestion);
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
  jasmineSupportsToHaveSize: boolean,
  hasAmbiguousJasmineJestGlobalExpect: boolean,
): Suggestion | null {
  switch (style) {
    case 'jest-like':
      return getExpectLikeSuggestion(
        node,
        sourceCode,
        'jest',
        true,
        hasAmbiguousJasmineJestGlobalExpect,
      );
    case 'playwright':
      return getExpectLikeSuggestion(node, sourceCode, 'jest');
    case 'jasmine':
      return getExpectLikeSuggestion(node, sourceCode, 'jasmine', jasmineSupportsToHaveSize);
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

function getExpectLikeSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
  family: 'jest' | 'jasmine',
  jasmineSupportsToHaveSize = true,
  skipLengthEqualitySuggestions = false,
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
    if (family === 'jasmine' && node.callee.property.name === 'toBe') {
      return null;
    }
    return replacement(`${prefix}.toBeNaN()`, node, sourceCode);
  }
  if (isLengthAccess(actual)) {
    if (skipLengthEqualitySuggestions) {
      return null;
    }
    if (family === 'jasmine' && !jasmineSupportsToHaveSize) {
      return null;
    }
    const lengthMatcher = family === 'jasmine' ? 'toHaveSize' : 'toHaveLength';
    return replacement(
      `expect(${sourceCode.getText(actual.object)}).${negated ? 'not.' : ''}${lengthMatcher}(${expectedText})`,
      node,
      sourceCode,
      'preferSpecificLengthAssertion',
    );
  }
  const booleanExpected = getBooleanValue(expected);
  if (booleanExpected === undefined) {
    return null;
  }
  if (skipLengthEqualitySuggestions && isLengthEqualityComparison(actual)) {
    return null;
  }
  return getBooleanExpressionSuggestion(
    actual,
    booleanExpected !== negated,
    family,
    sourceCode,
    node,
  );
}

function supportsJasmineToHaveSize(context: Rule.RuleContext): boolean {
  const dependencies = getDependenciesSanitizePaths(context);

  for (const dependency of JASMINE_SIZE_DEPENDENCIES) {
    const versionSignal = dependencies.get(dependency);
    if (!versionSignal || versionSignal === 'latest' || versionSignal === '*') {
      continue;
    }

    try {
      const version = minVersion(versionSignal);
      return version !== null && version.compare(JASMINE_TO_HAVE_SIZE_MIN_VERSION) >= 0;
    } catch {
      return false;
    }
  }

  return false;
}

// For bare global expect(), mixed Jasmine/Jest dependency signals are ambiguous:
// there is no import/FQN evidence to choose between toHaveSize() and toHaveLength().
function hasAmbiguousJasmineJestGlobalExpectSignal(context: Rule.RuleContext): boolean {
  if (importsModule(context, JEST_LIKE_MODULES) || importsModule(context, JASMINE_MODULES)) {
    return false;
  }

  const dependencies = getDependenciesSanitizePaths(context);
  return (
    JEST_LIKE_GLOBAL_MODULES.some(dependency => dependencies.has(dependency)) &&
    JASMINE_GLOBAL_MODULES.some(dependency => dependencies.has(dependency))
  );
}

function isLengthEqualityComparison(node: estree.Node): boolean {
  return (
    node.type === 'BinaryExpression' &&
    ['===', '!=='].includes(node.operator) &&
    (isLengthAccess(node.left) || isLengthAccess(node.right))
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
    !CHAI_EQUALITY_MATCHERS.has(node.callee.property.name) ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  const chain = getChaiExpectChain(node.callee.object, sourceCode);
  if (!chain) {
    return null;
  }
  return getChaiValueSuggestion(
    chain.actual,
    node.arguments[0],
    chain.negated,
    node,
    sourceCode,
    chain.messageArguments,
  );
}

function getChaiShouldSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  if (
    !isMethodCall(node) ||
    !CHAI_EQUALITY_MATCHERS.has(node.callee.property.name) ||
    node.arguments.length !== 1
  ) {
    return null;
  }
  const chain = getShouldChain(node.callee.object);
  if (!chain) {
    return null;
  }
  return getChaiShouldValueSuggestion(
    chain.actual,
    node.arguments[0],
    chain.negated,
    node,
    sourceCode,
  );
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
  const assertObject = getAssertObject(context, node);
  if (!assertObject) {
    return null;
  }
  const assertText = sourceCode.getText(assertObject);
  if (!['strictEqual', 'notStrictEqual'].includes(method)) {
    return null;
  }
  const actualText = sourceCode.getText(actual);
  const trailingArgs = messageArgument(node, sourceCode);
  if (isNullLiteral(expected)) {
    return replacement(
      `${assertText}.${negated ? 'isNotNull' : 'isNull'}(${actualText}${trailingArgs})`,
      node,
      sourceCode,
    );
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `${assertText}.${negated ? 'isDefined' : 'isUndefined'}(${actualText}${trailingArgs})`,
      node,
      sourceCode,
    );
  }
  if (isLengthAccess(actual) && !negated) {
    return replacement(
      `${assertText}.lengthOf(${sourceCode.getText(actual.object)}, ${sourceCode.getText(expected)}${trailingArgs})`,
      node,
      sourceCode,
      'preferSpecificLengthAssertion',
    );
  }
  const booleanExpected = getBooleanValue(expected);
  if (booleanExpected === undefined) {
    return null;
  }
  return getBooleanExpressionSuggestion(
    actual,
    booleanExpected !== negated,
    'assert',
    sourceCode,
    node,
    assertText,
    trailingArgs,
  );
}

function getChaiValueSuggestion(
  actual: estree.Node,
  expected: estree.Node,
  negated: boolean,
  node: estree.CallExpression,
  sourceCode: SourceCode,
  messageArguments = '',
): Suggestion | null {
  const actualText = sourceCode.getText(actual);
  if (isNullLiteral(expected)) {
    return replacement(
      `expect(${actualText}${messageArguments}).to${negated ? '.not' : ''}.be.null`,
      node,
      sourceCode,
    );
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `expect(${actualText}${messageArguments}).to${negated ? '.not' : ''}.be.undefined`,
      node,
      sourceCode,
    );
  }
  if (isLengthAccess(actual)) {
    return replacement(
      `expect(${sourceCode.getText(actual.object)}${messageArguments}).to${negated ? '.not' : ''}.have.lengthOf(${sourceCode.getText(expected)})`,
      node,
      sourceCode,
      'preferSpecificLengthAssertion',
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
    'expect',
    messageArguments,
  );
}

function getChaiShouldValueSuggestion(
  actual: estree.Node,
  expected: estree.Node,
  negated: boolean,
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  const actualText = sourceCode.getText(actual);
  if (isNullLiteral(expected)) {
    return replacement(
      `${chaiShouldReceiver(actualText, actual)}.should${negated ? '.not' : ''}.be.null`,
      node,
      sourceCode,
    );
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `${chaiShouldReceiver(actualText, actual)}.should${negated ? '.not' : ''}.be.undefined`,
      node,
      sourceCode,
    );
  }
  if (isLengthAccess(actual)) {
    const receiver = chaiShouldReceiver(sourceCode.getText(actual.object), actual.object);
    return replacement(
      `${receiver}.should${negated ? '.not' : ''}.have.lengthOf(${sourceCode.getText(expected)})`,
      node,
      sourceCode,
      'preferSpecificLengthAssertion',
    );
  }
  const booleanExpected = getBooleanValue(expected);
  if (booleanExpected === undefined) {
    return null;
  }
  return getBooleanExpressionSuggestion(
    actual,
    booleanExpected !== negated,
    'chai-should',
    sourceCode,
    node,
  );
}

function getChaiExpectChain(
  node: estree.Node,
  sourceCode: SourceCode,
): { actual: estree.Node; negated: boolean; messageArguments: string } | null {
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
  const [actual, ...messageArguments] = current.type === 'CallExpression' ? current.arguments : [];
  if (current.type !== 'CallExpression' || !isIdentifier(current.callee, 'expect') || !actual) {
    return null;
  }
  return {
    actual,
    negated,
    messageArguments: messageArguments
      .map(argument => `, ${sourceCode.getText(argument)}`)
      .join(''),
  };
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

function getAssertObject(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): estree.Node | null {
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed ||
    node.callee.property.type !== 'Identifier'
  ) {
    return null;
  }
  const object = node.callee.object;
  if (
    isIdentifier(object, 'assert') ||
    (object.type === 'MemberExpression' && isIdentifier(object.property, 'assert')) ||
    getFullyQualifiedName(context, node.callee)?.startsWith('chai.assert.')
  ) {
    return object;
  }
  return null;
}

function messageArgument(node: estree.CallExpression, sourceCode: SourceCode): string {
  return node.arguments[2] ? `, ${sourceCode.getText(node.arguments[2])}` : '';
}
