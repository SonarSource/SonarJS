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
import {
  isLengthAccess,
  isNullLiteral,
  isUndefinedExpression,
  replacement,
  type Suggestion,
} from './assertion-utils.js';

type AssertionFamily = 'jest' | 'jasmine' | 'chai' | 'chai-should' | 'assert';

type NumericComparison = {
  jest: string;
  chai: string;
  assert: string;
};

type SpecificEqualitySuggestion = Suggestion | null | undefined;
type SuggestionContext = {
  family: AssertionFamily;
  sourceCode: SourceCode;
  node: estree.CallExpression;
  assertObject: string;
  extraArguments: string;
};

const STRICT_EQUALITY_OPERATORS = new Set(['===', '!==']);
const STRING_LIKE_IDENTIFIER = /(?:text|string|message|content|html)$/i;
const NUMERIC_IDENTIFIER =
  /(?:amount|count|delta|depth|diff|duration|elapsed|height|index|length|level|limit|number|price|score|size|total|width)$/i;
const DATE_LIKE_IDENTIFIER = /(?:date|time|timestamp)$/i;
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

export function chaiShouldReceiver(source: string, node: estree.Node): string {
  return isSafeChaiShouldReceiver(node) ? source : `(${source})`;
}

const SAFE_CHAI_SHOULD_RECEIVER_TYPES = new Set([
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'ThisExpression',
]);

function isSafeChaiShouldReceiver(node: estree.Node): boolean {
  return SAFE_CHAI_SHOULD_RECEIVER_TYPES.has(node.type);
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
  const suggestionContext = { family, sourceCode, node, assertObject, extraArguments };

  if (STRICT_EQUALITY_OPERATORS.has(actual.operator)) {
    const same = actual.operator === '===' ? positive : !positive;
    const specificSuggestion = buildSpecificEqualitySuggestion(actual, same, suggestionContext);
    if (specificSuggestion !== undefined) {
      return specificSuggestion;
    }
    return buildEqualitySuggestion(actual.left, right, same, suggestionContext);
  }

  if (actual.operator === 'instanceof') {
    return buildInstanceofSuggestion(left, actual.left, right, positive, suggestionContext);
  }

  const comparison = isNumericComparison(actual)
    ? getNumericComparison(actual.operator, positive)
    : null;
  if (comparison) {
    return buildNumericComparisonSuggestion(
      left,
      actual.left,
      right,
      comparison,
      suggestionContext,
    );
  }

  return null;
}

function buildSpecificEqualitySuggestion(
  actual: estree.BinaryExpression,
  same: boolean,
  context: SuggestionContext,
): SpecificEqualitySuggestion {
  const leftNullish = getNullishKind(actual.left);
  if (leftNullish) {
    return buildNullishEqualitySuggestion(actual.right, leftNullish, same, context);
  }

  const rightNullish = getNullishKind(actual.right);
  if (rightNullish) {
    return buildNullishEqualitySuggestion(actual.left, rightNullish, same, context);
  }

  if (isLengthAccess(actual.left)) {
    return buildLengthEqualitySuggestion(
      actual.left.object,
      context.sourceCode.getText(actual.right),
      same,
      context,
    );
  }

  if (isLengthAccess(actual.right)) {
    return buildLengthEqualitySuggestion(
      actual.right.object,
      context.sourceCode.getText(actual.left),
      same,
      context,
    );
  }

  return undefined;
}

function getNullishKind(node: estree.Node): 'null' | 'undefined' | null {
  if (isNullLiteral(node)) {
    return 'null';
  }
  if (isUndefinedExpression(node)) {
    return 'undefined';
  }
  return null;
}

function buildNullishEqualitySuggestion(
  actualNode: estree.Node,
  nullish: 'null' | 'undefined',
  same: boolean,
  context: SuggestionContext,
): Suggestion {
  const { family, sourceCode, node, assertObject, extraArguments } = context;
  const actual = sourceCode.getText(actualNode);
  if (family === 'jest' || family === 'jasmine') {
    if (nullish === 'null') {
      return replacement(`expect(${actual})${negation(same)}.toBeNull()`, node);
    }
    return replacement(
      same ? `expect(${actual}).toBeUndefined()` : `expect(${actual}).toBeDefined()`,
      node,
    );
  }
  if (family === 'assert') {
    const method = getAssertNullishMethod(nullish, same);
    return replacement(`${assertObject}.${method}(${actual}${extraArguments})`, node);
  }
  if (family === 'chai-should') {
    return replacement(
      `${chaiShouldReceiver(actual, actualNode)}.should${negation(same)}.be.${nullish}`,
      node,
    );
  }
  return replacement(`expect(${actual}${extraArguments}).to${negation(same)}.be.${nullish}`, node);
}

function getAssertNullishMethod(nullish: 'null' | 'undefined', same: boolean): string {
  if (nullish === 'null') {
    return same ? 'isNull' : 'isNotNull';
  }
  return same ? 'isUndefined' : 'isDefined';
}

function buildLengthEqualitySuggestion(
  actualNode: estree.Node,
  expected: string,
  same: boolean,
  context: SuggestionContext,
): Suggestion | null {
  const { family, sourceCode, node, assertObject, extraArguments } = context;
  const actual = sourceCode.getText(actualNode);
  if (family === 'jest' || family === 'jasmine') {
    const matcher = family === 'jasmine' ? 'toHaveSize' : 'toHaveLength';
    return replacement(
      `expect(${actual})${negation(same)}.${matcher}(${expected})`,
      node,
      undefined,
      'preferSpecificLengthAssertion',
    );
  }
  if (family === 'assert') {
    return same
      ? replacement(
          `${assertObject}.lengthOf(${actual}, ${expected}${extraArguments})`,
          node,
          undefined,
          'preferSpecificLengthAssertion',
        )
      : null;
  }
  if (family === 'chai-should') {
    return replacement(
      `${chaiShouldReceiver(actual, actualNode)}.should${negation(same)}.have.lengthOf(${expected})`,
      node,
      undefined,
      'preferSpecificLengthAssertion',
    );
  }
  return replacement(
    `expect(${actual}${extraArguments}).to${negation(same)}.have.lengthOf(${expected})`,
    node,
    undefined,
    'preferSpecificLengthAssertion',
  );
}

function buildEqualitySuggestion(
  leftNode: estree.Node,
  right: string,
  same: boolean,
  context: SuggestionContext,
): Suggestion {
  const { family, sourceCode, node, assertObject, extraArguments } = context;
  const left = sourceCode.getText(leftNode);
  if (family === 'jest' || family === 'jasmine') {
    return replacement(`expect(${left})${negation(same)}.toBe(${right})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${same ? 'strictEqual' : 'notStrictEqual'}(${left}, ${right}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(
      `${chaiShouldReceiver(left, leftNode)}.should${negation(same)}.equal(${right})`,
      node,
    );
  }
  return replacement(`expect(${left}${extraArguments}).to${negation(same)}.equal(${right})`, node);
}

function buildInstanceofSuggestion(
  left: string,
  leftNode: estree.Node,
  right: string,
  positive: boolean,
  context: SuggestionContext,
): Suggestion {
  const { family, node, assertObject, extraArguments } = context;
  if (family === 'jest' || family === 'jasmine') {
    return replacement(`expect(${left})${negation(positive)}.toBeInstanceOf(${right})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${positive ? 'instanceOf' : 'notInstanceOf'}(${left}, ${right}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(
      `${chaiShouldReceiver(left, leftNode)}.should${negation(positive)}.be.instanceOf(${right})`,
      node,
    );
  }
  return replacement(
    `expect(${left}${extraArguments}).to${negation(positive)}.be.instanceOf(${right})`,
    node,
  );
}

function buildNumericComparisonSuggestion(
  left: string,
  leftNode: estree.Node,
  right: string,
  comparison: NumericComparison,
  context: SuggestionContext,
): Suggestion {
  const { family, node, assertObject, extraArguments } = context;
  if (family === 'jest' || family === 'jasmine') {
    return replacement(`expect(${left}).${comparison.jest}(${right})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${comparison.assert}(${left}, ${right}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(
      `${chaiShouldReceiver(left, leftNode)}.should.be.${comparison.chai}(${right})`,
      node,
    );
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
  if (family === 'jest' || family === 'jasmine') {
    return replacement(`expect(${receiver})${negation(positive)}.toContain(${needle})`, node);
  }
  if (family === 'assert') {
    return replacement(
      `${assertObject}.${positive ? 'include' : 'notInclude'}(${receiver}, ${needle}${extraArguments})`,
      node,
    );
  }
  if (family === 'chai-should') {
    return replacement(
      `${chaiShouldReceiver(receiver, actual.callee.object)}.should${negation(positive)}.include(${needle})`,
      node,
    );
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

function isNumericComparison(node: estree.BinaryExpression): boolean {
  return (
    isKnownNumericOperand(node.left) &&
    isKnownNumericOperand(node.right) &&
    !isKnownNonNumericOperand(node.left) &&
    !isKnownNonNumericOperand(node.right)
  );
}

function isKnownNumericOperand(node: estree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'number' || typeof node.value === 'bigint';
  }
  if (node.type === 'UnaryExpression' && ['+', '-'].includes(node.operator)) {
    return isKnownNumericOperand(node.argument);
  }
  if (isIdentifier(node)) {
    return NUMERIC_IDENTIFIER.test(node.name);
  }
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property)) {
    return NUMERIC_IDENTIFIER.test(node.property.name);
  }
  return false;
}

function isKnownNonNumericOperand(node: estree.Node): boolean {
  if (node.type === 'Literal') {
    return typeof node.value === 'string';
  }
  if (node.type === 'TemplateLiteral') {
    return node.expressions.length === 0;
  }
  if (node.type === 'NewExpression' && isIdentifier(node.callee, 'Date')) {
    return true;
  }
  if (node.type === 'CallExpression' && isIdentifier(node.callee, 'Date')) {
    return true;
  }
  if (isIdentifier(node)) {
    return STRING_LIKE_IDENTIFIER.test(node.name) || DATE_LIKE_IDENTIFIER.test(node.name);
  }
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property)) {
    return (
      STRING_LIKE_IDENTIFIER.test(node.property.name) ||
      DATE_LIKE_IDENTIFIER.test(node.property.name)
    );
  }
  return false;
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
