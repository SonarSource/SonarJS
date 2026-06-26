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
// https://sonarsource.github.io/rspec/#/rspec/S5976/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { childrenOf } from '../helpers/ancestor.js';
import { getVariableFromScope } from '../helpers/ast.js';
import { areEquivalent } from '../helpers/equivalence.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import {
  getFullyQualifiedName,
  importsModule,
  importsOrDependsOnModule,
} from '../helpers/module.js';
import { getMochaCalleeParts, getStaticTitle } from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  replaceWithParameterizedTest: 'Replace these {{count}} tests with a single Parameterized one.',
};

const JEST_MODULES = ['jest', '@jest/globals'];
const PLAYWRIGHT_MODULES = ['@playwright/test'];
const VITEST_MODULES = ['vitest'];
const SUPPORTED_MODULE_FQNS = ['jest', '@jest.globals', 'vitest', '@playwright.test'];
const UNSUPPORTED_TEST_MODULES = [
  'cypress',
  'jasmine',
  'jasmine-core',
  'jasmine-node',
  'karma-jasmine',
  'mocha',
] as const;

const TEST_FUNCTION_NAMES = new Set(['it', 'test']);
const COMMON_TEST_MODIFIERS = new Set(['only']);
const JEST_TEST_MODIFIERS = new Set(['concurrent', 'failing']);
const PLAYWRIGHT_TEST_MODIFIERS = new Set(['fail', 'slow']);
const VITEST_TEST_MODIFIERS = new Set(['concurrent', 'fails', 'sequential']);
const NON_CONCRETE_TEST_MODIFIERS = new Set(['each', 'fixme', 'skip', 'todo']);

const MIN_SIMILAR_TESTS = 3;
const MIN_STATEMENTS = 2;
const MAX_PARAMETERS = 3;

type FunctionNode = estree.FunctionExpression | estree.ArrowFunctionExpression;

interface ActiveFrameworks {
  jest: boolean;
  playwright: boolean;
  vitest: boolean;
}

interface ScopeFrame {
  disabled: boolean;
  tests: TestCandidate[];
}

interface TestCall {
  callback: FunctionNode;
  concrete: boolean;
}

interface TestCandidate extends TestCall {
  body: estree.Statement[];
  titleNode: estree.Node;
}

type LiteralCategory = 'bigint' | 'boolean' | 'null' | 'number' | 'string';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const activeFrameworks = {
      jest: importsOrDependsOnModule(context, JEST_MODULES, JEST_MODULES),
      playwright: importsOrDependsOnModule(context, PLAYWRIGHT_MODULES, PLAYWRIGHT_MODULES),
      vitest: importsOrDependsOnModule(context, VITEST_MODULES, VITEST_MODULES),
    };

    if (!Object.values(activeFrameworks).some(Boolean)) {
      return {};
    }

    const allowGlobalTestFunctions = !importsUnsupportedFrameworkForGlobals(context);
    const scopeStack: ScopeFrame[] = [];
    const functionStack: FunctionNode[] = [];
    const testCallbacks = new Set<FunctionNode>();

    function pushFrame(disabled: boolean) {
      scopeStack.push({ disabled, tests: [] });
    }

    function currentFrame(): ScopeFrame | undefined {
      return scopeStack.at(-1);
    }

    return {
      Program() {
        pushFrame(false);
      },
      'Program:exit'() {
        const frame = scopeStack.pop();
        if (frame !== undefined) {
          checkSimilarTests(context, frame.tests);
        }
      },
      BlockStatement(node: estree.BlockStatement) {
        const currentFunction = functionStack.at(-1);
        const isTestCallbackBody =
          currentFunction !== undefined &&
          testCallbacks.has(currentFunction) &&
          currentFunction.body === node;
        pushFrame(Boolean(currentFrame()?.disabled || isTestCallbackBody));
      },
      'BlockStatement:exit'() {
        const frame = scopeStack.pop();
        if (frame !== undefined && !frame.disabled) {
          checkSimilarTests(context, frame.tests);
        }
      },
      ':function'(node: estree.Node) {
        if (isCallbackFunctionNode(node)) {
          functionStack.push(node);
        }
      },
      ':function:exit'(node: estree.Node) {
        if (isCallbackFunctionNode(node)) {
          testCallbacks.delete(node);
          functionStack.pop();
        }
      },
      CallExpression(node: estree.CallExpression) {
        const testCall = getTestCall(context, node, activeFrameworks, allowGlobalTestFunctions);
        if (testCall === undefined) {
          return;
        }

        testCallbacks.add(testCall.callback);

        const candidate = toTestCandidate(node, testCall);
        const frame = currentFrame();
        if (candidate !== undefined && frame !== undefined && !frame.disabled) {
          frame.tests.push(candidate);
        }
      },
    };
  },
};

function importsUnsupportedFrameworkForGlobals(context: Rule.RuleContext): boolean {
  return importsModule(context, [...UNSUPPORTED_TEST_MODULES]);
}

function getTestCall(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  activeFrameworks: ActiveFrameworks,
  allowGlobalTestFunctions: boolean,
): TestCall | undefined {
  const classification = classifyTestCall(
    context,
    node,
    activeFrameworks,
    allowGlobalTestFunctions,
  );
  if (classification === undefined) {
    return undefined;
  }

  const callback = node.arguments.find(isCallbackFunctionNode);
  if (callback === undefined) {
    return undefined;
  }

  return { callback, concrete: classification === 'concrete' };
}

function classifyTestCall(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  activeFrameworks: ActiveFrameworks,
  allowGlobalTestFunctions: boolean,
): 'concrete' | 'ignored' | undefined {
  const calleeParts = getMochaCalleeParts(node.callee);
  if (calleeParts === undefined) {
    return undefined;
  }

  const testConstruct = getSupportedTestConstruct(
    context,
    calleeParts.base,
    calleeParts.modifiers,
    activeFrameworks,
    allowGlobalTestFunctions,
  );
  if (testConstruct === undefined) {
    return undefined;
  }

  if (testConstruct.modifiers.every(modifier => isConcreteModifier(modifier, activeFrameworks))) {
    return 'concrete';
  }

  if (testConstruct.modifiers.some(modifier => NON_CONCRETE_TEST_MODIFIERS.has(modifier))) {
    return 'ignored';
  }

  return 'ignored';
}

function getSupportedTestConstruct(
  context: Rule.RuleContext,
  base: estree.Identifier,
  modifiers: string[],
  activeFrameworks: ActiveFrameworks,
  allowGlobalTestFunctions: boolean,
): { name: string; modifiers: string[] } | undefined {
  const fqn = getFullyQualifiedName(context, base);
  const importedName = getTestNameFromFullyQualifiedName(fqn);
  if (importedName !== undefined) {
    return { name: importedName, modifiers };
  }

  if (modifiers.length > 0 && TEST_FUNCTION_NAMES.has(modifiers[0]) && isSupportedModule(fqn)) {
    return { name: modifiers[0], modifiers: modifiers.slice(1) };
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(base), base.name);
  if (
    allowGlobalTestFunctions &&
    (variable === undefined || variable.defs.length === 0) &&
    TEST_FUNCTION_NAMES.has(base.name) &&
    (activeFrameworks.jest || activeFrameworks.vitest)
  ) {
    return { name: base.name, modifiers };
  }

  return undefined;
}

function getTestNameFromFullyQualifiedName(fqn: string | null): string | undefined {
  if (fqn === null) {
    return undefined;
  }

  const moduleName = SUPPORTED_MODULE_FQNS.find(moduleName => fqn.startsWith(`${moduleName}.`));
  const testName = moduleName === undefined ? undefined : fqn.slice(moduleName.length + 1);
  return testName !== undefined && TEST_FUNCTION_NAMES.has(testName) ? testName : undefined;
}

function isSupportedModule(fqn: string | null): boolean {
  return fqn !== null && SUPPORTED_MODULE_FQNS.includes(fqn);
}

function isConcreteModifier(modifier: string, activeFrameworks: ActiveFrameworks): boolean {
  return (
    COMMON_TEST_MODIFIERS.has(modifier) ||
    (activeFrameworks.jest && JEST_TEST_MODIFIERS.has(modifier)) ||
    (activeFrameworks.playwright && PLAYWRIGHT_TEST_MODIFIERS.has(modifier)) ||
    (activeFrameworks.vitest && VITEST_TEST_MODIFIERS.has(modifier))
  );
}

function toTestCandidate(
  node: estree.CallExpression,
  testCall: TestCall,
): TestCandidate | undefined {
  const titleNode = node.arguments[0];
  if (!testCall.concrete || titleNode === undefined || getStaticTitle(titleNode) === undefined) {
    return undefined;
  }

  const { callback } = testCall;
  if (callback.body.type !== 'BlockStatement' || callback.body.body.length < MIN_STATEMENTS) {
    return undefined;
  }

  return {
    ...testCall,
    body: callback.body.body,
    titleNode,
  };
}

function checkSimilarTests(context: Rule.RuleContext, tests: TestCandidate[]) {
  if (tests.length < MIN_SIMILAR_TESTS) {
    return;
  }

  const handled = new Set<TestCandidate>();
  for (const [index, test] of tests.entries()) {
    if (handled.has(test)) {
      continue;
    }

    const literalCollector = new LiteralDifferenceCollector(context, test.body);
    const equivalentTests: TestCandidate[] = [];

    for (const otherTest of tests.slice(index + 1)) {
      if (handled.has(otherTest)) {
        continue;
      }

      if (
        literalCollector.matches(otherTest.body) &&
        literalCollector.acceptCurrentWithinLimits(MAX_PARAMETERS)
      ) {
        equivalentTests.push(otherTest);
      }
      literalCollector.clearCurrent();
    }

    reportIfIssue(context, test, literalCollector, equivalentTests, handled);
  }
}

function reportIfIssue(
  context: Rule.RuleContext,
  test: TestCandidate,
  literalCollector: LiteralDifferenceCollector,
  equivalentTests: TestCandidate[],
  handled: Set<TestCandidate>,
) {
  if (equivalentTests.length + 1 < MIN_SIMILAR_TESTS) {
    return;
  }

  const parameterNodes = literalCollector.nodesToParameterize;
  if (parameterNodes.size === 0) {
    return;
  }

  handled.add(test);
  for (const equivalentTest of equivalentTests) {
    handled.add(equivalentTest);
  }

  report(
    context,
    {
      node: test.titleNode,
      messageId: 'replaceWithParameterizedTest',
      message: messages.replaceWithParameterizedTest,
      data: { count: String(equivalentTests.length + 1) },
    },
    [
      ...[...parameterNodes].map(node => toSecondaryLocation(node, 'Value to parameterize')),
      ...equivalentTests.map(({ titleNode }) => toSecondaryLocation(titleNode, 'Related test')),
    ],
  );
}

class LiteralDifferenceCollector {
  readonly nodesToParameterize = new Set<estree.Literal>();
  private readonly literalNodesByTokenRange: Map<string, estree.Literal>;
  private readonly currentNodesToParameterize = new Set<estree.Literal>();

  constructor(
    private readonly context: Rule.RuleContext,
    private readonly baseBody: estree.Statement[],
  ) {
    this.literalNodesByTokenRange = collectLiteralNodes(context, baseBody);
  }

  matches(otherBody: estree.Statement[]): boolean {
    const otherLiteralNodesByTokenRange = collectLiteralNodes(this.context, otherBody);
    return areEquivalent(this.baseBody, otherBody, this.context.sourceCode, (left, right) => {
      if (left.value === right.value) {
        return true;
      }

      const leftLiteral = this.literalNodesByTokenRange.get(tokenRangeKey(left));
      const rightLiteral = otherLiteralNodesByTokenRange.get(tokenRangeKey(right));
      if (leftLiteral === undefined || rightLiteral === undefined) {
        return false;
      }

      const leftCategory = literalCategory(leftLiteral);
      if (leftCategory === undefined || leftCategory !== literalCategory(rightLiteral)) {
        return false;
      }

      if (Object.is(leftLiteral.value, rightLiteral.value)) {
        return true;
      }

      this.currentNodesToParameterize.add(leftLiteral);
      return true;
    });
  }

  acceptCurrentWithinLimits(maxParameters: number): boolean {
    const parameterCount = new Set([
      ...this.nodesToParameterize,
      ...this.currentNodesToParameterize,
    ]).size;
    if (parameterCount > maxParameters || this.baseBody.length <= parameterCount) {
      return false;
    }

    for (const node of this.currentNodesToParameterize) {
      this.nodesToParameterize.add(node);
    }
    return true;
  }

  clearCurrent() {
    this.currentNodesToParameterize.clear();
  }
}

function collectLiteralNodes(
  context: Rule.RuleContext,
  nodes: estree.Node | estree.Node[],
): Map<string, estree.Literal> {
  const result = new Map<string, estree.Literal>();
  const nodeList = Array.isArray(nodes) ? nodes : [nodes];

  for (const node of nodeList) {
    collectLiteralNode(context, node, result);
  }

  return result;
}

function collectLiteralNode(
  context: Rule.RuleContext,
  node: estree.Node,
  result: Map<string, estree.Literal>,
) {
  if (node.type === 'Literal' && literalCategory(node) !== undefined) {
    const firstToken = context.sourceCode.getFirstToken(node);
    if (firstToken !== null) {
      result.set(tokenRangeKey(firstToken), node);
    }
    return;
  }

  for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
    collectLiteralNode(context, child, result);
  }
}

function tokenRangeKey(token: { range?: [number, number] }): string {
  return token.range?.join(':') ?? '';
}

function literalCategory(node: estree.Literal): LiteralCategory | undefined {
  if ('regex' in node && node.regex !== undefined) {
    return undefined;
  }

  if (node.value === null) {
    return 'null';
  }

  switch (typeof node.value) {
    case 'bigint':
      return 'bigint';
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    default:
      return undefined;
  }
}

function isCallbackFunctionNode(node: estree.Node | estree.SpreadElement): node is FunctionNode {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}
