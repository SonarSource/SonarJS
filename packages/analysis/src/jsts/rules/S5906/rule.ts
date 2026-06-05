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
import { extractTestAssertion, type AssertionStyle } from '../helpers/assertions.js';
import { getVariableFromName, isIdentifier, isMethodCall } from '../helpers/ast.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { chaiShouldReceiver, getBooleanExpressionSuggestion } from './assertion-suggestions.js';
import {
  getBooleanValue,
  isLengthAccess,
  isNaNExpression,
  isNullLiteral,
  isPlaywrightLocatorExpression,
  isUndefinedExpression,
  replacement,
  type Suggestion,
} from './assertion-utils.js';
import { getCypressSuggestion } from './cypress-suggestions.js';
import { getExpectChain } from './expect-chain.js';
import * as meta from './generated-meta.js';
import { getPlaywrightLocatorSuggestion } from './playwright-suggestions.js';

const messages = {
  preferSpecificAssertion:
    'Prefer a more specific assertion instead of this generic one, e.g. "{{assertion}}".',
  quickfix: 'Replace with {{assertion}}.',
};

const PLAYWRIGHT_MODULES = ['@playwright/test'];
const MAX_ASSERT_ARGUMENTS_WITH_MESSAGE = 3;
const CHAI_EQUALITY_MATCHERS = new Set(['equal', 'equals', 'eq', 'eql', 'eqls']);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages, hasSuggestions: true }),
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    const hasPlaywright = importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES);
    const playwrightLocators = new Set<Scope.Variable>();
    // Remember member refs that are invoked elsewhere so `foo.bar.length` can be treated as
    // function arity rather than collection size.
    const calledMemberExpressions = new Set<string>();

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
        if (node.callee.type === 'MemberExpression' && !node.callee.computed) {
          calledMemberExpressions.add(sourceCode.getText(node.callee));
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
          calledMemberExpressions,
        );
        if (suggestion) {
          report(node, suggestion);
        }
      },
      VariableDeclarator(node: estree.Node) {
        if (!hasPlaywright || node.type !== 'VariableDeclarator' || !isIdentifier(node.id)) {
          return;
        }
        if (node.init && isPlaywrightLocatorExpression(context, node.init, playwrightLocators)) {
          const variable = sourceCode.getDeclaredVariables(node)[0];
          if (variable) {
            playwrightLocators.add(variable);
          }
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
  calledMemberExpressions: ReadonlySet<string>,
): Suggestion | null {
  switch (style) {
    case 'jest-like':
    case 'playwright':
      return getExpectLikeSuggestion(context, node, sourceCode, 'jest', calledMemberExpressions);
    case 'jasmine':
      return getExpectLikeSuggestion(context, node, sourceCode, 'jasmine', calledMemberExpressions);
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
  context: Rule.RuleContext,
  node: estree.CallExpression,
  sourceCode: SourceCode,
  family: 'jest' | 'jasmine',
  calledMemberExpressions: ReadonlySet<string>,
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
  const lengthMatcher = family === 'jasmine' ? 'toHaveSize' : 'toHaveLength';

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
  // `.length` is ambiguous in JavaScript: collections expose a size, while functions expose arity.
  // Only suggest dedicated length matchers for obvious collection-style targets.
  if (
    isLengthAccess(actual) &&
    isCollectionLengthTarget(context, actual.object, sourceCode, calledMemberExpressions)
  ) {
    return replacement(
      `expect(${sourceCode.getText(actual.object)}).${negated ? 'not.' : ''}${lengthMatcher}(${expectedText})`,
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
    family,
    sourceCode,
    node,
  );
}

function isCollectionLengthTarget(
  context: Rule.RuleContext,
  node: estree.Node,
  sourceCode: SourceCode,
  calledMemberExpressions: ReadonlySet<string>,
): boolean {
  return !isFunctionLikeLengthTarget(context, node, sourceCode, calledMemberExpressions);
}

function isFunctionLikeLengthTarget(
  context: Rule.RuleContext,
  node: estree.Node,
  sourceCode: SourceCode,
  calledMemberExpressions: ReadonlySet<string>,
): boolean {
  if (node.type === 'Identifier') {
    return isFunctionLikeIdentifier(context, node);
  }

  return (
    node.type === 'MemberExpression' &&
    (isPrototypeMethodReference(node) ||
      (!node.computed && calledMemberExpressions.has(sourceCode.getText(node))))
  );
}

function isFunctionLikeIdentifier(context: Rule.RuleContext, node: estree.Identifier): boolean {
  const variable = getVariableFromName(context, node.name, node);
  if (variable?.defs.length !== 1) {
    return false;
  }

  const def = variable.defs[0];
  switch (def.type) {
    case 'FunctionName':
    case 'ClassName':
      return true;
    case 'Variable':
      return isFunctionLikeInitializer(def.node.init);
    default:
      return false;
  }
}

function isFunctionLikeInitializer(node: estree.Expression | null | undefined): boolean {
  return (
    node?.type === 'FunctionExpression' ||
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'ClassExpression' ||
    isBoundFunction(node)
  );
}

function isBoundFunction(
  node: estree.Expression | null | undefined,
): node is estree.CallExpression & {
  callee: estree.MemberExpression & { property: estree.Identifier };
} {
  return (
    node?.type === 'CallExpression' && isMethodCall(node) && node.callee.property.name === 'bind'
  );
}

function isPrototypeMethodReference(
  node: estree.MemberExpression,
): node is estree.MemberExpression & {
  object: estree.MemberExpression & { property: estree.Identifier };
} {
  return (
    !node.computed &&
    node.object.type === 'MemberExpression' &&
    !node.object.computed &&
    isIdentifier(node.object.property, 'prototype')
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
