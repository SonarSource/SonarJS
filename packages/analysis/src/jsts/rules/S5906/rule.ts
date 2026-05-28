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
import { isIdentifier, isMethodCall } from '../helpers/ast.js';
import {
  getFullyQualifiedName,
  importsModule,
  importsOrDependsOnModule,
} from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const messages = {
  preferSpecificAssertion: 'Use a more specific assertion instead of this generic one.',
};

type Suggestion = {
  assertion: string;
  replacement?: string;
};

const JEST_LIKE_MODULES = ['vitest', 'bun:test', '@jest/globals', 'jest'];
const CHAI_MODULES = [
  'chai',
  'chai/register-assert',
  'chai/register-expect',
  'chai/register-should',
];
const CYPRESS_MODULES = ['cypress'];
const PLAYWRIGHT_MODULES = ['@playwright/test'];

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const hasJestLike = importsOrDependsOnModule(context, JEST_LIKE_MODULES, JEST_LIKE_MODULES);
    const hasChai = importsOrDependsOnModule(context, CHAI_MODULES, CHAI_MODULES);
    const hasCypress = importsOrDependsOnModule(context, CYPRESS_MODULES, CYPRESS_MODULES);
    const hasPlaywright = importsModule(context, PLAYWRIGHT_MODULES);

    function report(node: estree.CallExpression) {
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
          const playwrightSuggestion = getPlaywrightLocatorSuggestion(node, sourceCode);
          if (playwrightSuggestion) {
            report(node);
            return;
          }
        }
        if (hasJestLike) {
          const jestSuggestion = getJestLikeSuggestion(node, sourceCode);
          if (jestSuggestion) {
            report(node);
            return;
          }
        }
        if (hasChai) {
          const chaiSuggestion = getChaiSuggestion(context, node, sourceCode);
          if (chaiSuggestion) {
            report(node);
            return;
          }
        }
        if (hasCypress) {
          const cypressSuggestion = getCypressSuggestion(node, sourceCode);
          if (cypressSuggestion) {
            report(node);
          }
        }
      },
    };
  },
};

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
  const actual = chain.actual;
  const expected = node.arguments[0];
  const negated = chain.negated;
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

function getChaiSuggestion(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  sourceCode: SourceCode,
): Suggestion | null {
  return (
    getChaiExpectSuggestion(node, sourceCode) ??
    getChaiShouldSuggestion(node, sourceCode) ??
    getChaiAssertSuggestion(context, node, sourceCode)
  );
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
  if (!method || node.arguments.length < 2 || node.arguments.length > 3) {
    return null;
  }
  const actual = node.arguments[0];
  const expected = node.arguments[1];
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

function getBooleanExpressionSuggestion(
  actual: estree.Node,
  positive: boolean,
  family: 'jest' | 'chai',
  sourceCode: SourceCode,
  node: estree.CallExpression,
): Suggestion | null {
  if (actual.type === 'BinaryExpression') {
    const left = sourceCode.getText(actual.left);
    const right = sourceCode.getText(actual.right);
    if (['===', '==', '!==', '!='].includes(actual.operator)) {
      const same = ['===', '=='].includes(actual.operator) ? positive : !positive;
      return family === 'jest'
        ? replacement(`expect(${left})${same ? '' : '.not'}.toBe(${right})`, node, sourceCode)
        : replacement(`expect(${left}).to${same ? '' : '.not'}.equal(${right})`, node, sourceCode);
    }
    if (actual.operator === 'instanceof') {
      return family === 'jest'
        ? replacement(
            `expect(${left})${positive ? '' : '.not'}.toBeInstanceOf(${right})`,
            node,
            sourceCode,
          )
        : replacement(
            `expect(${left}).to${positive ? '' : '.not'}.be.instanceOf(${right})`,
            node,
            sourceCode,
          );
    }
    const comparison = getNumericComparison(actual.operator, positive);
    if (comparison) {
      return family === 'jest'
        ? replacement(`expect(${left}).${comparison.jest}(${right})`, node, sourceCode)
        : replacement(`expect(${left}).to.be.${comparison.chai}(${right})`, node, sourceCode);
    }
  }
  if (
    actual.type === 'CallExpression' &&
    isMethodCall(actual) &&
    isIdentifier(actual.callee.property, 'includes') &&
    actual.arguments.length === 1
  ) {
    const receiver = sourceCode.getText(actual.callee.object);
    const needle = sourceCode.getText(actual.arguments[0]);
    return family === 'jest'
      ? replacement(
          `expect(${receiver})${positive ? '' : '.not'}.toContain(${needle})`,
          node,
          sourceCode,
        )
      : replacement(
          `expect(${receiver}).to${positive ? '' : '.not'}.include(${needle})`,
          node,
          sourceCode,
        );
  }
  return null;
}

function getNumericComparison(operator: estree.BinaryOperator, positive: boolean) {
  const effective = positive ? operator : invertComparison(operator);
  switch (effective) {
    case '>':
      return { jest: 'toBeGreaterThan', chai: 'greaterThan' };
    case '>=':
      return { jest: 'toBeGreaterThanOrEqual', chai: 'greaterThanOrEqual' };
    case '<':
      return { jest: 'toBeLessThan', chai: 'lessThan' };
    case '<=':
      return { jest: 'toBeLessThanOrEqual', chai: 'lessThanOrEqual' };
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

function isLengthAccess(node: estree.Node): node is estree.MemberExpression {
  return (
    node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property, 'length')
  );
}

function isNullLiteral(node: estree.Node): boolean {
  return node.type === 'Literal' && node.value === null;
}

function isUndefinedExpression(node: estree.Node): boolean {
  return (
    isIdentifier(node, 'undefined') || (node.type === 'UnaryExpression' && node.operator === 'void')
  );
}

function isNaNExpression(node: estree.Node): boolean {
  return (
    isIdentifier(node, 'NaN') ||
    (node.type === 'MemberExpression' &&
      isIdentifier(node.object, 'Number') &&
      isIdentifier(node.property, 'NaN'))
  );
}

function getBooleanValue(node: estree.Node): boolean | undefined {
  return node.type === 'Literal' && typeof node.value === 'boolean' ? node.value : undefined;
}

function messageArgument(node: estree.CallExpression, sourceCode: SourceCode): string {
  return node.arguments[2] ? `, ${sourceCode.getText(node.arguments[2])}` : '';
}

function replacement(
  replacementText: string,
  _node: estree.CallExpression,
  _sourceCode: SourceCode,
): Suggestion {
  return {
    assertion: replacementText,
    replacement: replacementText,
  };
}
