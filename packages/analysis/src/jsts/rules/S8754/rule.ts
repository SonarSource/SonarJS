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
import {
  FUNCTION_NODES,
  getVariableFromScope,
  isIdentifier,
  isStaticTemplateLiteral,
  isStringLiteral,
} from '../helpers/ast.js';
import { childrenOf } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const SUPPORTED_TEST_FRAMEWORKS = ['jest', 'mocha', 'vitest', '@playwright/test'];
const MOCHA_STYLE_TEST_FRAMEWORKS = new Set(['jest', 'mocha', 'vitest']);
const TEST_FUNCTION_NAMES = ['it', 'specify', 'test'];
const SUITE_FUNCTION_NAMES = ['describe', 'context', 'suite'];
const CONCRETE_MOCHA_MODIFIERS = new Set(['only', 'concurrent']);
const PLAYWRIGHT_TEST_FQN = '@playwright.test.test';
const PLAYWRIGHT_TEST_MODIFIERS = new Set(['only']);
const PLAYWRIGHT_DESCRIBE_MODIFIERS = new Set(['parallel', 'serial']);
const PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER = 'only';
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

function getStaticTitle(node: estree.Node): string | undefined {
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (isStaticTemplateLiteral(node)) {
    const value = node.quasis[0].value;
    return value.cooked ?? value.raw;
  }
  return undefined;
}

function isSuiteDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  return (
    isMochaTestConstruct(context, node, SUITE_FUNCTION_NAMES) ||
    isPlaywrightDescribe(context, node.callee)
  );
}

function isTestDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  return isConcreteTestDeclaration(context, node) || isPlaywrightTest(context, node.callee);
}

function isConcreteTestDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  return isMochaTestConstruct(context, node, TEST_FUNCTION_NAMES) && hasCallback(node);
}

function isMochaTestConstruct(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  constructs: string[],
): boolean {
  const calleeParts = getMochaCalleeParts(node.callee);
  const constructName = calleeParts && getMochaConstructName(context, calleeParts.base);
  if (constructName === undefined || !constructs.includes(constructName)) {
    return false;
  }

  return calleeParts.modifiers.every(modifier => CONCRETE_MOCHA_MODIFIERS.has(modifier));
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
  const constructName = calleeParts && getMochaConstructName(context, calleeParts.base);
  if (constructName === undefined || !SUITE_FUNCTION_NAMES.includes(constructName)) {
    return false;
  }

  return !calleeParts.modifiers.every(modifier => CONCRETE_MOCHA_MODIFIERS.has(modifier));
}

function getMochaCalleeParts(
  node: estree.Node,
  modifiers: string[] = [],
): { base: estree.Identifier; modifiers: string[] } | undefined {
  if (node.type === 'Identifier') {
    return { base: node, modifiers };
  }

  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property)) {
    modifiers.unshift(node.property.name);
    return getMochaCalleeParts(node.object, modifiers);
  }

  if (node.type === 'CallExpression') {
    return getMochaCalleeParts(node.callee, modifiers);
  }

  return undefined;
}

function hasCallback(node: estree.CallExpression): boolean {
  return node.arguments.some(argument => FUNCTION_NODES.includes(argument.type));
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

function getMochaConstructName(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): string | undefined {
  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  if (
    variable?.defs.some(def => def.type === 'ImportBinding' || isSupportedRequireBinding(def.node))
  ) {
    return getMochaConstructNameFromFqn(getFullyQualifiedName(context, identifier));
  }

  return variable == null || variable.defs.length === 0 ? identifier.name : undefined;
}

function getMochaConstructNameFromFqn(fqn: string | null): string | undefined {
  const parts = fqn?.split('.');
  if (parts?.length !== 2) {
    return undefined;
  }

  const [framework, constructName] = parts;
  return MOCHA_STYLE_TEST_FRAMEWORKS.has(framework) ? constructName : undefined;
}

function isSupportedRequireBinding(node: estree.Node): boolean {
  if (node.type !== 'VariableDeclarator' || node.init == null) {
    return false;
  }

  const requireCall = getRequireCall(node.init);
  const moduleName = requireCall?.arguments[0];
  return (
    moduleName?.type === 'Literal' &&
    typeof moduleName.value === 'string' &&
    SUPPORTED_TEST_FRAMEWORKS.includes(moduleName.value)
  );
}

function getRequireCall(node: estree.Node): estree.CallExpression | undefined {
  if (isRequireCall(node)) {
    return node;
  }

  if (node.type === 'MemberExpression') {
    return getRequireCall(node.object);
  }

  return undefined;
}

function isRequireCall(node: estree.Node): node is estree.CallExpression {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require'
  );
}

function isPlaywrightDescribe(context: Rule.RuleContext, callee: estree.Node): boolean {
  return getPlaywrightDescribeClassification(context, callee) === 'concrete';
}

function isPlaywrightTest(context: Rule.RuleContext, callee: estree.Node): boolean {
  const qualifiers = getPlaywrightTestQualifiers(context, callee);
  if (qualifiers === undefined) {
    return false;
  }

  return qualifiers.every(qualifier => PLAYWRIGHT_TEST_MODIFIERS.has(qualifier));
}

function getPlaywrightTestQualifiers(
  context: Rule.RuleContext,
  node: estree.Node,
  qualifiers: string[] = [],
): string[] | undefined {
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property)) {
    qualifiers.unshift(node.property.name);
    return getPlaywrightTestQualifiers(context, node.object, qualifiers);
  }

  return getFullyQualifiedName(context, node) === PLAYWRIGHT_TEST_FQN ? qualifiers : undefined;
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

function getPlaywrightDescribeQualifiers(
  node: estree.Node,
  qualifiers: string[] = [],
): string[] | undefined {
  if (node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property)) {
    qualifiers.unshift(node.property.name);
    return getPlaywrightDescribeQualifiers(node.object, qualifiers);
  }

  return isIdentifier(node, 'test') ? qualifiers : undefined;
}
