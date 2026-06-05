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
import * as Playwright from '../helpers/playwright.js';
import * as meta from './generated-meta.js';

const SUPPORTED_TEST_FRAMEWORKS = ['jest', 'mocha', 'vitest', '@playwright/test'];
const TEST_FUNCTION_NAMES = ['it', 'specify', 'test'];
const SUITE_FUNCTION_NAMES = ['describe', 'context', 'suite'];
const CONCRETE_MOCHA_MODIFIERS = new Set(['only', 'concurrent']);
const PLAYWRIGHT_TEST_FQN = '@playwright.test.test';
const PLAYWRIGHT_TEST_MODIFIERS = new Set(['only']);
const PLAYWRIGHT_DESCRIBE_MODIFIERS = new Set(['parallel', 'serial']);
const MESSAGE = 'Rename this test title to make it unique within the suite.';
const MESSAGE_ID = 'renameDuplicateTitle';

interface SuiteFrame {
  titles: Map<string, estree.Node>;
}

type FunctionNode =
  | estree.FunctionDeclaration
  | estree.FunctionExpression
  | estree.ArrowFunctionExpression;

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
    const checkedHelpersBySuiteFrame = new WeakMap<SuiteFrame, WeakSet<estree.Node>>();
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
            checkHelperDefinedTests(context, node, currentSuiteFrame, checkedHelpersBySuiteFrame);
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
  checkedHelpersBySuiteFrame: WeakMap<SuiteFrame, WeakSet<estree.Node>>,
) {
  const helper = getLocalHelperFunction(context, node);
  if (helper === undefined || isHelperChecked(helper, suiteFrame, checkedHelpersBySuiteFrame)) {
    return;
  }

  markHelperChecked(helper, suiteFrame, checkedHelpersBySuiteFrame);
  checkHelperNode(context, helper.body, suiteFrame, checkedHelpersBySuiteFrame);
}

function checkHelperNode(
  context: Rule.RuleContext,
  node: estree.Node,
  suiteFrame: SuiteFrame,
  checkedHelpersBySuiteFrame: WeakMap<SuiteFrame, WeakSet<estree.Node>>,
) {
  if (node.type === 'CallExpression') {
    if (isIgnoredSuiteDeclaration(context, node)) {
      return;
    }

    if (isSuiteDeclaration(context, node)) {
      const nestedSuiteFrame = createSuiteFrame();
      const callback = getCallback(node);
      if (callback !== undefined) {
        checkHelperNode(context, callback.body, nestedSuiteFrame, checkedHelpersBySuiteFrame);
      }
      return;
    }

    if (isTestDeclaration(context, node)) {
      checkTestTitle(context, node, suiteFrame);
      return;
    }

    checkHelperDefinedTests(context, node, suiteFrame, checkedHelpersBySuiteFrame);
  }

  for (const child of childrenOf(node, context.sourceCode.visitorKeys)) {
    if (!FUNCTION_NODES.includes(child.type)) {
      checkHelperNode(context, child, suiteFrame, checkedHelpersBySuiteFrame);
    }
  }
}

function isHelperChecked(
  helper: estree.Node,
  suiteFrame: SuiteFrame,
  checkedHelpersBySuiteFrame: WeakMap<SuiteFrame, WeakSet<estree.Node>>,
): boolean {
  return checkedHelpersBySuiteFrame.get(suiteFrame)?.has(helper) ?? false;
}

function markHelperChecked(
  helper: estree.Node,
  suiteFrame: SuiteFrame,
  checkedHelpersBySuiteFrame: WeakMap<SuiteFrame, WeakSet<estree.Node>>,
) {
  let checkedHelpers = checkedHelpersBySuiteFrame.get(suiteFrame);
  if (checkedHelpers === undefined) {
    checkedHelpers = new WeakSet();
    checkedHelpersBySuiteFrame.set(suiteFrame, checkedHelpers);
  }
  checkedHelpers.add(helper);
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
  if (calleeParts === undefined || !constructs.includes(calleeParts.base.name)) {
    return false;
  }

  return (
    !isLocallyDefined(context, calleeParts.base) &&
    calleeParts.modifiers.every(modifier => CONCRETE_MOCHA_MODIFIERS.has(modifier))
  );
}

function isIgnoredSuiteDeclaration(
  context: Rule.RuleContext,
  node: estree.CallExpression,
): boolean {
  const callee = node.callee;
  if (isNonConcreteMochaSuite(context, callee)) {
    return true;
  }

  const qualifiers = getPlaywrightTestQualifiers(context, callee);
  return (
    qualifiers?.[0] === 'describe' &&
    !qualifiers.slice(1).every(qualifier => PLAYWRIGHT_DESCRIBE_MODIFIERS.has(qualifier))
  );
}

function isNonConcreteMochaSuite(context: Rule.RuleContext, node: estree.Node): boolean {
  const calleeParts = getMochaCalleeParts(node);
  if (calleeParts === undefined || !SUITE_FUNCTION_NAMES.includes(calleeParts.base.name)) {
    return false;
  }

  return (
    !isLocallyDefined(context, calleeParts.base) &&
    !calleeParts.modifiers.every(modifier => CONCRETE_MOCHA_MODIFIERS.has(modifier))
  );
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

function getCallback(node: estree.CallExpression): FunctionNode | undefined {
  return node.arguments.find(isFunctionNode);
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

function isLocallyDefined(context: Rule.RuleContext, identifier: estree.Identifier): boolean {
  const variable = getVariableFromScope(context.sourceCode.getScope(identifier), identifier.name);
  return (
    variable != null &&
    !variable.defs.some(def => def.type === 'ImportBinding' || isSupportedRequireBinding(def.node))
  );
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
  if (callee.type === 'MemberExpression' && !callee.computed) {
    if (Playwright.isDescribe(callee)) {
      return true;
    }

    if (
      isIdentifier(callee.property, 'only', 'skip', 'fixme') &&
      Playwright.isDescribe(callee.object)
    ) {
      return true;
    }
  }

  const qualifiers = getPlaywrightTestQualifiers(context, callee);
  return (
    qualifiers?.[0] === 'describe' &&
    qualifiers.slice(1).every(qualifier => PLAYWRIGHT_DESCRIBE_MODIFIERS.has(qualifier))
  );
}

function isPlaywrightTest(context: Rule.RuleContext, callee: estree.Node): boolean {
  const qualifiers = getPlaywrightTestQualifiers(context, callee);
  if (qualifiers === undefined || qualifiers.length === 0) {
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
