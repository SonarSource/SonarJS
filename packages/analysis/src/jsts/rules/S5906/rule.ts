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
import { isMethodCall } from '../helpers/ast.js';
import { getDependenciesSanitizePaths } from '../helpers/dependency-manifests/dependencies.js';
import { importsModule, importsOrDependsOnModule } from '../helpers/module.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getBooleanExpressionSuggestion } from './assertion-suggestions.js';
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
import { getChaiBddSuggestion, getChaiAssertSuggestion } from './chai-suggestions.js';
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
