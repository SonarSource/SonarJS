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

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { chaiShouldReceiver, getBooleanExpressionSuggestion } from './assertion-suggestions.js';
import {
  getBooleanValue,
  isLengthAccess,
  isNullLiteral,
  isUndefinedExpression,
  replacement,
  type Suggestion,
} from './assertion-utils.js';

const MAX_ASSERT_ARGUMENTS_WITH_MESSAGE = 3;
const CHAI_EQUALITY_MATCHERS = new Set(['equal', 'equals', 'eq', 'eql', 'eqls']);

export function getChaiBddSuggestion(
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  return getChaiExpectSuggestion(node, sourceCode) ?? getChaiShouldSuggestion(node, sourceCode);
}

export function getChaiAssertSuggestion(
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
  const [actual, ...messageArgs] = current.type === 'CallExpression' ? current.arguments : [];
  if (current.type !== 'CallExpression' || !isIdentifier(current.callee, 'expect') || !actual) {
    return null;
  }
  return {
    actual,
    negated,
    messageArguments: messageArgs.map(argument => `, ${sourceCode.getText(argument)}`).join(''),
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
