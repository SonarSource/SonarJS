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
  getMochaConstructName,
  getPlaywrightDescribeQualifiers,
  getPlaywrightTestQualifiers,
  getStaticTitle,
  hasCallback,
  isConcreteMochaTestModifier,
  isMochaTestConstruct,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const PLAYWRIGHT_DISABLED_DESCRIBE_MODIFIERS = new Set(['skip', 'fixme']);
const MESSAGE = 'Rename this test title to make it unique within the suite.';
const MESSAGE_ID = 'renameDuplicateTitle';

type PlaywrightDescribeClassification = 'concrete' | 'ignored' | 'unknown';

interface SuiteFrame {
  titles: Map<string, estree.Node>;
}

type FunctionNode =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;
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

    let suiteStack: SuiteFrame[] = [createSuiteFrame()];
    const pushedSuiteCalls = new Set<estree.Node>();
    const concreteSuiteCallbacks = new Set<estree.Node>();
    const helperExpansionPath = new Set<estree.Node>();
    let testNesting = 0;
    let ignoredSuiteNesting = 0;
    let functionNesting = 0;
    let concreteSuiteCallbackNesting = 0;

    return {
      CallExpression(node: estree.CallExpression) {
        if (isIgnoredSuiteDeclaration(context, node)) {
          ignoredSuiteNesting++;
        } else if (isSuiteDeclaration(context, node)) {
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
          testNesting === 0 &&
          isInConcreteCollectionCallback(functionNesting, concreteSuiteCallbackNesting)
        ) {
          if (isTestDeclaration(context, node)) {
            checkTestTitle(context, node, currentSuiteFrame);
          } else {
            checkHelperDefinedTests(context, node, currentSuiteFrame, helperExpansionPath);
          }
        }

        if (isConcreteTestDeclaration(context, node)) {
          testNesting++;
        }
      },
      'CallExpression:exit'(node: estree.CallExpression) {
        if (isIgnoredSuiteDeclaration(context, node)) {
          ignoredSuiteNesting--;
        }

        if (isConcreteTestDeclaration(context, node)) {
          testNesting--;
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
        helperExpansionPath.clear();
        testNesting = 0;
        ignoredSuiteNesting = 0;
        functionNesting = 0;
        concreteSuiteCallbackNesting = 0;
      },
    };
  },
};

function createSuiteFrame(): SuiteFrame {
  return { titles: new Map() };
}

function checkTestTitle(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  suiteFrame: SuiteFrame,
) {
  const titleNode = node.arguments[0];
  const title = titleNode && getStaticTitle(titleNode);
  if (title === undefined) {
    return;
  }

  const originalTitleNode = suiteFrame.titles.get(title);
  if (originalTitleNode) {
    report(
      context,
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
  context: Rule.RuleContext,
  node: estree.CallExpression,
  suiteFrame: SuiteFrame,
  helperExpansionPath: Set<estree.Node>,
) {
  const helper = getLocalHelperFunction(context, node);
  if (helper === undefined || helperExpansionPath.has(helper)) {
    return;
  }

  helperExpansionPath.add(helper);
  checkHelperNode(context, helper.body, suiteFrame, helperExpansionPath);
  helperExpansionPath.delete(helper);
}

function checkHelperNode(
  context: Rule.RuleContext,
  node: estree.Node,
  suiteFrame: SuiteFrame,
  helperExpansionPath: Set<estree.Node>,
) {
  if (node.type === 'CallExpression') {
    if (isIgnoredSuiteDeclaration(context, node)) {
      return;
    }

    if (isSuiteDeclaration(context, node)) {
      const nestedSuiteFrame = createSuiteFrame();
      const callback = getCallback(node);
      if (callback !== undefined) {
        checkHelperNode(context, callback.body, nestedSuiteFrame, helperExpansionPath);
      }
      return;
    }

    if (isTestDeclaration(context, node)) {
      checkTestTitle(context, node, suiteFrame);
      return;
    }

    checkHelperDefinedTests(context, node, suiteFrame, helperExpansionPath);
  }

  for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
    if (!FUNCTION_NODES.includes(child.type)) {
      checkHelperNode(context, child, suiteFrame, helperExpansionPath);
    }
  }
}

function isSuiteDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  return (
    isMochaTestConstruct(context, node, SUITE_FUNCTION_NAMES) ||
    isPlaywrightDescribe(context, node.callee)
  );
}

function isTestDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  return isConcreteTestDeclaration(context, node) || isPlaywrightTest(context, node);
}

function isConcreteTestDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  return isMochaTestConstruct(context, node, TEST_FUNCTION_NAMES) && hasCallback(node);
}

function isIgnoredSuiteDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  if (isNonConcreteMochaSuite(context, node.callee)) {
    return true;
  }

  return getPlaywrightDescribeClassification(context, node.callee) === 'ignored';
}

function isNonConcreteMochaSuite(context: Rule.RuleContext, node: estree.Node): boolean {
  const calleeParts = getMochaCalleeParts(node);
  if (calleeParts === undefined) {
    return false;
  }

  const constructName = getMochaConstructName(context, calleeParts.base);
  if (constructName === undefined || !SUITE_FUNCTION_NAMES.includes(constructName)) {
    return false;
  }

  return !calleeParts.modifiers.every(modifier => isConcreteMochaTestModifier(context, modifier));
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

function isPlaywrightDescribe(context: Rule.RuleContext, callee: estree.Node): boolean {
  return getPlaywrightDescribeClassification(context, callee) === 'concrete';
}

function isPlaywrightTest(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  const qualifiers = getPlaywrightTestQualifiers(context, node.callee);
  if (qualifiers === undefined) {
    return false;
  }

  return (
    qualifiers.every(qualifier => PLAYWRIGHT_TEST_MODIFIERS.has(qualifier)) &&
    (!qualifiers.includes('fail') || hasCallback(node))
  );
}

function getPlaywrightDescribeClassification(
  context: Rule.RuleContext,
  callee: estree.Node,
): PlaywrightDescribeClassification {
  const qualifiers =
    getPlaywrightTestQualifiers(context, callee) ?? getPlaywrightDescribeQualifiers(callee);
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
