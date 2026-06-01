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

import type { SourceCode } from 'eslint';
import type estree from 'estree';
import { isIdentifier, isMethodCall } from '../helpers/ast.js';

export type Suggestion = {
  assertion: string;
  replacement?: string;
};

type AssertionFamily = 'jest' | 'chai' | 'chai-should' | 'assert';

type NumericComparison = {
  jest: string;
  chai: string;
  assert: string;
};

const EQUALITY_OPERATORS = new Set(['===', '==', '!==', '!=']);
const POSITIVE_EQUALITY_OPERATORS = new Set(['===', '==']);
const STRING_LIKE_IDENTIFIER = /(?:text|string|message|content|html)$/i;

export function getBooleanExpressionSuggestion(
  actual: estree.Node,
  positive: boolean,
  family: AssertionFamily,
  sourceCode: SourceCode,
  node: estree.CallExpression,
  assertObject = 'assert',
  extraArguments = '',
): Suggestion | null {
  if (actual.type === 'BinaryExpression') {
    return getBinaryExpressionSuggestion(
      actual,
      positive,
      family,
      sourceCode,
      node,
      assertObject,
      extraArguments,
    );
  }
  return getIncludesSuggestion(
    actual,
    positive,
    family,
    sourceCode,
    node,
    assertObject,
    extraArguments,
  );
}

function getBinaryExpressionSuggestion(
  actual: estree.BinaryExpression,
  positive: boolean,
  family: AssertionFamily,
  sourceCode: SourceCode,
  node: estree.CallExpression,
  assertObject: string,
  extraArguments: string,
): Suggestion | null {
  const left = sourceCode.getText(actual.left);
  const right = sourceCode.getText(actual.right);

  if (EQUALITY_OPERATORS.has(actual.operator)) {
    const same = POSITIVE_EQUALITY_OPERATORS.has(actual.operator) ? positive : !positive;
    return buildEqualitySuggestion(left, right, same, family, node, assertObject, extraArguments);
  }

  if (actual.operator === 'instanceof') {
    return buildInstanceofSuggestion(
      left,
      right,
      positive,
      family,
      node,
      assertObject,
      extraArguments,
    );
  }

  const comparison = getNumericComparison(actual.operator, positive);
  if (comparison) {
    return buildNumericComparisonSuggestion(
      left,
      right,
      comparison,
      family,
      node,
      assertObject,
      extraArguments,
    );
  }

  return null;
}

function buildEqualitySuggestion(
  left: string,
  right: string,
  same: boolean,
  family: AssertionFamily,
  node: estree.CallExpression,
  assertObject: string,
  extraArguments: string,
): Suggestion {
  if (family === 'jest') {
    return replacement(`expect(${left})${negation(same)}.toBe(${right})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${same ? 'strictEqual' : 'notStrictEqual'}(${left}, ${right}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(`${left}.should${negation(same)}.equal(${right})`, node);
  }
  return replacement(`expect(${left}${extraArguments}).to${negation(same)}.equal(${right})`, node);
}

function buildInstanceofSuggestion(
  left: string,
  right: string,
  positive: boolean,
  family: AssertionFamily,
  node: estree.CallExpression,
  assertObject: string,
  extraArguments: string,
): Suggestion {
  if (family === 'jest') {
    return replacement(`expect(${left})${negation(positive)}.toBeInstanceOf(${right})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${positive ? 'instanceOf' : 'notInstanceOf'}(${left}, ${right}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(`${left}.should${negation(positive)}.be.instanceOf(${right})`, node);
  }
  return replacement(
    `expect(${left}${extraArguments}).to${negation(positive)}.be.instanceOf(${right})`,
    node,
  );
}

function buildNumericComparisonSuggestion(
  left: string,
  right: string,
  comparison: NumericComparison,
  family: AssertionFamily,
  node: estree.CallExpression,
  assertObject: string,
  extraArguments: string,
): Suggestion {
  if (family === 'jest') {
    return replacement(`expect(${left}).${comparison.jest}(${right})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${comparison.assert}(${left}, ${right}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(`${left}.should.be.${comparison.chai}(${right})`, node);
  }
  return replacement(`expect(${left}${extraArguments}).to.be.${comparison.chai}(${right})`, node);
}

function getIncludesSuggestion(
  actual: estree.Node,
  positive: boolean,
  family: AssertionFamily,
  sourceCode: SourceCode,
  node: estree.CallExpression,
  assertObject: string,
  extraArguments: string,
): Suggestion | null {
  if (
    actual.type !== 'CallExpression' ||
    !isMethodCall(actual) ||
    !isIdentifier(actual.callee.property, 'includes') ||
    actual.arguments.length !== 1 ||
    !isTrustedStringReceiver(actual.callee.object)
  ) {
    return null;
  }

  const receiver = sourceCode.getText(actual.callee.object);
  const needle = sourceCode.getText(actual.arguments[0]);
  if (family === 'jest') {
    return replacement(`expect(${receiver})${negation(positive)}.toContain(${needle})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${positive ? 'include' : 'notInclude'}(${receiver}, ${needle}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(`${receiver}.should${negation(positive)}.include(${needle})`, node);
  }
  return replacement(
    `expect(${receiver}${extraArguments}).to${negation(positive)}.include(${needle})`,
    node,
  );
}

function negation(positive: boolean): string {
  return positive ? '' : '.not';
}

function isTrustedStringReceiver(node: estree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'string';
  }
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }
  return isIdentifier(node) && STRING_LIKE_IDENTIFIER.test(node.name);
}

function getNumericComparison(
  operator: estree.BinaryOperator,
  positive: boolean,
): NumericComparison | null {
  const effective = positive ? operator : invertComparison(operator);
  switch (effective) {
    case '>':
      return { jest: 'toBeGreaterThan', chai: 'above', assert: 'isAbove' };
    case '>=':
      return { jest: 'toBeGreaterThanOrEqual', chai: 'at.least', assert: 'isAtLeast' };
    case '<':
      return { jest: 'toBeLessThan', chai: 'below', assert: 'isBelow' };
    case '<=':
      return { jest: 'toBeLessThanOrEqual', chai: 'at.most', assert: 'isAtMost' };
    default:
      return null;
  }
}

function invertComparison(operator: estree.BinaryOperator): estree.BinaryOperator | null {
  switch (operator) {
    case '>':
      return '<=';
    case '>=':
      return '<';
    case '<':
      return '>=';
    case '<=':
      return '>';
    default:
      return null;
  }
}

export function isPlaywrightLocatorExpression(
  node: estree.Node,
  locatorNames: ReadonlySet<string>,
): boolean {
  if (isIdentifier(node)) {
    return locatorNames.has(node.name);
  }
  if (node.type !== 'CallExpression' || !isMethodCall(node)) {
    return false;
  }
  const property = node.callee.property;
  return (
    isIdentifier(property) &&
    (property.name.startsWith('getBy') || ['locator', 'frameLocator'].includes(property.name))
  );
}

export function isLengthAccess(node: estree.Node): node is estree.MemberExpression {
  return (
    node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'length')
  );
}

export function isNullLiteral(node: estree.Node): boolean {
  return node.type === 'Literal' && node.value === null;
}

export function isUndefinedExpression(node: estree.Node): boolean {
  return (
    isIdentifier(node, 'undefined') || (node.type === 'UnaryExpression' && node.operator === 'void')
  );
}

export function isNaNExpression(node: estree.Node): boolean {
  return (
    isIdentifier(node, 'NaN') ||
    (node.type === 'MemberExpression' &&
      isIdentifier(node.object, 'Number') &&
      isIdentifier(node.property, 'NaN'))
  );
}

export function getBooleanValue(node: estree.Node): boolean | undefined {
  return node.type === 'Literal' && typeof node.value === 'boolean' ? node.value : undefined;
}

export function replacement(
  replacementText: string,
  _node: estree.CallExpression,
  _sourceCode?: SourceCode,
): Suggestion {
  return {
    assertion: replacementText,
    replacement: replacementText,
  };
}
