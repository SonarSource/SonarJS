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
// https://sonarsource.github.io/rspec/#/rspec/S8754/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { FUNCTION_NODES, getVariableFromScope } from '../helpers/ast.js';
import { childrenOf } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import {
  PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER,
  PLAYWRIGHT_DESCRIBE_MODIFIERS,
  PLAYWRIGHT_TEST_MODIFIERS,
  SUITE_FUNCTION_NAMES,
  SUPPORTED_TEST_FRAMEWORKS,
  TEST_FUNCTION_NAMES,
  getMochaCalleeParts,
  getMochaConstructAndModifiers,
  getPlaywrightDescribeQualifiers,
  getPlaywrightTestQualifiers,
  getStaticTitle,
  hasCallback,
  isConcreteMochaTestModifier,
} from '../helpers/testing/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const PLAYWRIGHT_DISABLED_DESCRIBE_MODIFIERS = new Set(['skip', 'fixme']);
const MESSAGE = 'Rename this test title to make it unique within the suite.';
const MESSAGE_ID = 'renameDuplicateTitle';

type PlaywrightDescribeClassification = 'concrete' | 'ignored' | 'unknown';

interface SuiteFrame {
  titles: Map<string, estree.Node>;
  expandedHelpers: Map<FunctionNode, HelperExpansion>;
}

interface CallClassification {
  ignoredSuite: boolean;
  suite: boolean;
  test: boolean;
  concreteTest: boolean;
}

/**
 * Test declarations collected from a local helper body. Summaries are computed once per helper
 * and replayed at every call site, so the helper body is not traversed again for each call.
 */
type HelperEvent =
  | { kind: 'test'; node: estree.CallExpression }
  | { kind: 'suite'; events: HelperEvent[] }
  | { kind: 'helper'; helper: FunctionNode };

interface HelperExpansion {
  tests: Set<estree.CallExpression>;
  // Shallowest active helper reached by a cycle; Infinity means no unresolved cycle.
  cycleDepth: number;
}

interface RuleState {
  context: Rule.RuleContext;
  classifications: WeakMap<estree.CallExpression, CallClassification>;
  helperSummaries: Map<FunctionNode, HelperEvent[]>;
  helperExpansionPath: Map<FunctionNode, number>;
  checkedHelperSuites: Set<HelperEvent>;
  reportedDuplicates: WeakMap<estree.Node, WeakSet<estree.Node>>;
}

type FunctionNode =
  estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;
type CallbackFunctionNode = estree.FunctionExpression | estree.ArrowFunctionExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      [MESSAGE_ID]: MESSAGE,
    },
  }),
  create(context: Rule.RuleContext) {
    if (!importsOrDependsOnModule(context, SUPPORTED_TEST_FRAMEWORKS, SUPPORTED_TEST_FRAMEWORKS)) {
      return {};
    }

    const state: RuleState = {
      context,
      classifications: new WeakMap(),
      helperSummaries: new Map(),
      helperExpansionPath: new Map(),
      checkedHelperSuites: new Set(),
      reportedDuplicates: new WeakMap(),
    };
    let suiteStack: SuiteFrame[] = [createSuiteFrame()];
    const pushedSuiteCalls = new Set<estree.Node>();
    const concreteSuiteCallbacks = new Set<estree.Node>();
    // Calls nested in a concrete test body cannot declare collected tests or suites, so they are
    // skipped entirely until the outermost test call exits.
    let activeTest: estree.Node | undefined;
    let ignoredSuiteNesting = 0;
    let functionNesting = 0;
    let concreteSuiteCallbackNesting = 0;

    return {
      CallExpression(node: estree.CallExpression) {
        if (activeTest !== undefined) {
          return;
        }

        const classification = classify(state, node);
        if (classification.ignoredSuite) {
          ignoredSuiteNesting++;
        } else if (classification.suite) {
          pushedSuiteCalls.add(node);
          const callback = getCallback(node);
          if (callback !== undefined) {
            concreteSuiteCallbacks.add(callback);
          }
          suiteStack.push(createSuiteFrame());
        }

        const currentSuiteFrame = suiteStack.at(-1);
        if (
          currentSuiteFrame !== undefined &&
          ignoredSuiteNesting === 0 &&
          isInConcreteCollectionCallback(functionNesting, concreteSuiteCallbackNesting)
        ) {
          if (classification.test) {
            checkTestTitle(state, node, currentSuiteFrame);
          } else {
            checkHelperDefinedTests(state, node, currentSuiteFrame);
          }
        }

        if (classification.concreteTest) {
          activeTest = node;
        }
      },
      'CallExpression:exit'(node: estree.CallExpression) {
        if (activeTest !== undefined) {
          if (activeTest === node) {
            activeTest = undefined;
          }
          return;
        }

        if (classify(state, node).ignoredSuite) {
          ignoredSuiteNesting--;
        }

        if (pushedSuiteCalls.delete(node)) {
          suiteStack.pop();
        }
      },
      ':function'(node: estree.Node) {
        functionNesting++;
        if (concreteSuiteCallbacks.has(node)) {
          concreteSuiteCallbackNesting++;
        }
      },
      ':function:exit'(node: estree.Node) {
        if (concreteSuiteCallbacks.delete(node)) {
          concreteSuiteCallbackNesting--;
        }
        functionNesting--;
      },
      'Program:exit'() {
        suiteStack = [createSuiteFrame()];
        pushedSuiteCalls.clear();
        concreteSuiteCallbacks.clear();
        state.helperSummaries.clear();
        state.helperExpansionPath.clear();
        state.checkedHelperSuites.clear();
        activeTest = undefined;
        ignoredSuiteNesting = 0;
        functionNesting = 0;
        concreteSuiteCallbackNesting = 0;
      },
    };
  },
};

function createSuiteFrame(): SuiteFrame {
  return { titles: new Map(), expandedHelpers: new Map() };
}

function checkTestTitle(state: RuleState, node: estree.CallExpression, suiteFrame: SuiteFrame) {
  const titleNode = node.arguments[0];
  const title = titleNode && getStaticTitle(titleNode);
  if (title === undefined) {
    return;
  }

  const originalTitleNode = suiteFrame.titles.get(title);
  if (originalTitleNode) {
    // Repeated helper expansion can reach the same declaration many times. One issue for each
    // primary/secondary location pair is sufficient, including a helper's self-duplicate.
    let originals = state.reportedDuplicates.get(titleNode);
    if (originals?.has(originalTitleNode)) {
      return;
    }
    if (originals === undefined) {
      originals = new WeakSet();
      state.reportedDuplicates.set(titleNode, originals);
    }
    originals.add(originalTitleNode);
    report(
      state.context,
      {
        node: titleNode,
        messageId: MESSAGE_ID,
        message: MESSAGE,
      },
      [toSecondaryLocation(originalTitleNode, 'Original test title.')],
    );
    return;
  }

  suiteFrame.titles.set(title, titleNode);
}

function checkHelperDefinedTests(
  state: RuleState,
  node: estree.CallExpression,
  suiteFrame: SuiteFrame,
) {
  const helper = getLocalHelperFunction(state.context, node);
  if (helper !== undefined) {
    expandHelper(state, helper, suiteFrame);
  }
}

function expandHelper(
  state: RuleState,
  helper: FunctionNode,
  suiteFrame: SuiteFrame,
): HelperExpansion {
  const cycleDepth = state.helperExpansionPath.get(helper);
  if (cycleDepth !== undefined) {
    return { tests: new Set(), cycleDepth };
  }

  const cached = suiteFrame.expandedHelpers.get(helper);
  if (cached !== undefined) {
    // Replay only the distinct declarations reached by this helper, rather than re-expanding
    // its call graph. Rechecking titles is needed when the same helper is invoked twice.
    for (const test of cached.tests) {
      checkTestTitle(state, test, suiteFrame);
    }
    return cached;
  }

  const depth = state.helperExpansionPath.size;
  state.helperExpansionPath.set(helper, depth);
  const expansion = replayHelperEvents(state, getHelperSummary(state, helper), suiteFrame);
  state.helperExpansionPath.delete(helper);
  // A cycle closing on this helper or a descendant is contained in its expansion. A cycle
  // reaching an active ancestor truncates the result according to the caller's path instead.
  if (expansion.cycleDepth >= depth) {
    expansion.cycleDepth = Infinity;
    suiteFrame.expandedHelpers.set(helper, expansion);
  }
  return expansion;
}

function replayHelperEvents(
  state: RuleState,
  events: HelperEvent[],
  suiteFrame: SuiteFrame,
): HelperExpansion {
  const expansion: HelperExpansion = { tests: new Set(), cycleDepth: Infinity };
  for (const event of events) {
    switch (event.kind) {
      case 'test':
        checkTestTitle(state, event.node, suiteFrame);
        expansion.tests.add(event.node);
        break;
      case 'suite': {
        expansion.cycleDepth = Math.min(expansion.cycleDepth, checkHelperSuite(state, event));
        break;
      }
      case 'helper': {
        const nested = expandHelper(state, event.helper, suiteFrame);
        expansion.cycleDepth = Math.min(expansion.cycleDepth, nested.cycleDepth);
        for (const test of nested.tests) {
          expansion.tests.add(test);
        }
        break;
      }
    }
  }
  return expansion;
}

function checkHelperSuite(
  state: RuleState,
  event: Extract<HelperEvent, { kind: 'suite' }>,
): number {
  // Helper-defined suites have their own title frame, so their diagnostics do not depend
  // on the caller's suite unless recursion truncates their expansion along the current path.
  if (state.checkedHelperSuites.has(event)) {
    return Infinity;
  }

  const nested = replayHelperEvents(state, event.events, createSuiteFrame());
  if (nested.cycleDepth === Infinity) {
    state.checkedHelperSuites.add(event);
  }
  return nested.cycleDepth;
}

function getHelperSummary(state: RuleState, helper: FunctionNode): HelperEvent[] {
  let events = state.helperSummaries.get(helper);
  if (events === undefined) {
    events = [];
    collectHelperEvents(state, helper.body, events);
    state.helperSummaries.set(helper, events);
  }
  return events;
}

function collectHelperEvents(state: RuleState, node: estree.Node, events: HelperEvent[]) {
  if (node.type === 'CallExpression') {
    const classification = classify(state, node);
    if (classification.ignoredSuite) {
      return;
    }

    if (classification.suite) {
      const nestedEvents: HelperEvent[] = [];
      const callback = getCallback(node);
      if (callback !== undefined) {
        collectHelperEvents(state, callback.body, nestedEvents);
      }
      events.push({ kind: 'suite', events: nestedEvents });
      return;
    }

    if (classification.test) {
      events.push({ kind: 'test', node });
      return;
    }

    const helper = getLocalHelperFunction(state.context, node);
    if (helper !== undefined) {
      events.push({ kind: 'helper', helper });
    }
  }

  for (const child of childrenOf(node, state.context.sourceCode.visitorKeys)) {
    if (!FUNCTION_NODES.includes(child.type)) {
      collectHelperEvents(state, child, events);
    }
  }
}

function classify(state: RuleState, node: estree.CallExpression): CallClassification {
  let classification = state.classifications.get(node);
  if (classification === undefined) {
    classification = computeClassification(state.context, node);
    state.classifications.set(node, classification);
  }
  return classification;
}

function computeClassification(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): CallClassification {
  const mocha = getMochaClassification(context, node.callee);
  const playwrightTestQualifiers = getPlaywrightTestQualifiers(context, node.callee);
  const playwrightDescribe = getPlaywrightDescribeClassification(
    playwrightTestQualifiers ?? getPlaywrightDescribeQualifiers(node.callee),
  );
  const concreteTest = mocha.test && hasCallback(node);
  return {
    ignoredSuite: mocha.nonConcreteSuite || playwrightDescribe === 'ignored',
    suite: mocha.suite || playwrightDescribe === 'concrete',
    test: concreteTest || isPlaywrightTest(playwrightTestQualifiers, node),
    concreteTest,
  };
}

function getMochaClassification(
  context: Rule.RuleContext,
  callee: estree.Node,
): { suite: boolean; nonConcreteSuite: boolean; test: boolean } {
  const calleeParts = getMochaCalleeParts(callee);
  if (calleeParts === undefined) {
    return { suite: false, nonConcreteSuite: false, test: false };
  }

  const { constructName, modifiers } = getMochaConstructAndModifiers(context, calleeParts);
  const isSuite = constructName !== undefined && SUITE_FUNCTION_NAMES.includes(constructName);
  const isTest = constructName !== undefined && TEST_FUNCTION_NAMES.includes(constructName);
  if (!isSuite && !isTest) {
    return { suite: false, nonConcreteSuite: false, test: false };
  }

  const concrete = modifiers.every(modifier => isConcreteMochaTestModifier(context, modifier));
  return {
    suite: isSuite && concrete,
    nonConcreteSuite: isSuite && !concrete,
    test: isTest && concrete,
  };
}

function getCallback(node: estree.CallExpression): CallbackFunctionNode | undefined {
  return node.arguments.find(isCallbackFunctionNode);
}

function isCallbackFunctionNode(
  node: estree.CallExpression['arguments'][number],
): node is CallbackFunctionNode {
  return node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression';
}

function isFunctionNode(node: estree.Node): node is FunctionNode {
  return FUNCTION_NODES.includes(node.type);
}

function getLocalHelperFunction(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): FunctionNode | undefined {
  if (node.callee.type !== 'Identifier') {
    return undefined;
  }

  const variable = getVariableFromScope(context.sourceCode.getScope(node.callee), node.callee.name);
  const definition = variable?.defs.find(isLocalFunctionDefinition);
  if (definition?.node.type === 'FunctionDeclaration') {
    return definition.node;
  }

  if (
    definition?.node.type === 'VariableDeclarator' &&
    definition.node.init != null &&
    isFunctionNode(definition.node.init)
  ) {
    return definition.node.init;
  }

  return undefined;
}

function isLocalFunctionDefinition(definition: Scope.Definition): boolean {
  if (definition.type === 'FunctionName') {
    return true;
  }

  return (
    definition.type === 'Variable' &&
    definition.node.type === 'VariableDeclarator' &&
    definition.node.init != null &&
    isFunctionNode(definition.node.init)
  );
}

function isInConcreteCollectionCallback(
  functionNesting: number,
  concreteSuiteCallbackNesting: number,
): boolean {
  return functionNesting === concreteSuiteCallbackNesting;
}

function isPlaywrightTest(qualifiers: string[] | undefined, node: estree.CallExpression): boolean {
  if (qualifiers === undefined) {
    return false;
  }

  return (
    qualifiers.every(qualifier => PLAYWRIGHT_TEST_MODIFIERS.has(qualifier)) &&
    (!qualifiers.includes('fail') || hasCallback(node))
  );
}

function getPlaywrightDescribeClassification(
  qualifiers: string[] | undefined,
): PlaywrightDescribeClassification {
  if (qualifiers?.[0] !== 'describe') {
    return 'unknown';
  }

  const modifiers = qualifiers.slice(1);
  if (modifiers.some(modifier => PLAYWRIGHT_DISABLED_DESCRIBE_MODIFIERS.has(modifier))) {
    return 'ignored';
  }

  const runnableModifiers =
    modifiers.at(-1) === PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER ? modifiers.slice(0, -1) : modifiers;
  return runnableModifiers.every(modifier => PLAYWRIGHT_DESCRIBE_MODIFIERS.has(modifier))
    ? 'concrete'
    : 'unknown';
}
