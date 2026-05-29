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
import { getCypressSuggestion } from './cypress-suggestions.js';
import * as meta from './generated-meta.js';
import { getPlaywrightLocatorSuggestion } from './playwright-suggestions.js';

const messages = {
  preferSpecificAssertion: 'Use the more specific assertion {{assertion}}.',
  quickfix: 'Replace with {{assertion}}.',
};

const PLAYWRIGHT_MODULES = ['@playwright/test'];
const MAX_ASSERT_ARGUMENTS_WITH_MESSAGE = 3;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const hasPlaywright = importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES);
    const playwrightLocators = new Set<string>();

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
        messageId: 'preferSpecificAssertion',
        data: { assertion: suggestion.assertion },
        ...(suggest ? { suggest } : {}),
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
        if (!hasPlaywright || node.type !== 'VariableDeclarator' || !isIdentifier(node.id)) {
          return;
        }
        if (node.init && isPlaywrightLocatorExpression(node.init, playwrightLocators)) {
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
  if (isLengthAccess(actual)) {
    return replacement(
      `expect(${sourceCode.getText(actual.object)}).${negated ? 'not.' : ''}toHaveLength(${expectedText})`,
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
    !['equal', 'eql'].includes(node.callee.property.name) ||
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
    return replacement(`${actualText}.should${negated ? '.not' : ''}.be.null`, node, sourceCode);
  }
  if (isUndefinedExpression(expected)) {
    return replacement(
      `${actualText}.should${negated ? '.not' : ''}.be.undefined`,
      node,
      sourceCode,
    );
  }
  return getChaiValueSuggestion(actual, expected, negated, node, sourceCode);
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
