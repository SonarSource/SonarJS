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

import type { Rule } from 'eslint';
import type estree from 'estree';
import { isIdentifier, isStaticTemplateLiteral, isStringLiteral } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as Mocha from '../helpers/mocha.js';
import * as Playwright from '../helpers/playwright.js';
import * as meta from './generated-meta.js';

const SUPPORTED_TEST_FRAMEWORKS = ['jest', 'mocha', 'vitest', '@playwright/test'];
const TEST_FUNCTION_NAMES = ['it', 'specify', 'test'];
const SUITE_FUNCTION_NAMES = ['describe', 'context', 'suite'];
const PLAYWRIGHT_TEST_FQN = '@playwright.test.test';
const PLAYWRIGHT_MODIFIERS = ['only', 'skip', 'fixme', 'parallel', 'serial'];
const MESSAGE = 'Rename this test title to make it unique within the suite.';
const MESSAGE_ID = 'renameDuplicateTitle';

interface SuiteFrame {
  titles: Map<string, estree.Node>;
}

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

    return {
      CallExpression(node: estree.CallExpression) {
        if (isSuiteDeclaration(context, node)) {
          pushedSuiteCalls.add(node);
          suiteStack.push(createSuiteFrame());
        }

        if (isTestDeclaration(context, node)) {
          checkTestTitle(context, node, suiteStack.at(-1)!);
        }
      },
      'CallExpression:exit'(node: estree.CallExpression) {
        if (pushedSuiteCalls.delete(node)) {
          suiteStack.pop();
        }
      },
      'Program:exit'() {
        suiteStack = [createSuiteFrame()];
        pushedSuiteCalls.clear();
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
    Mocha.isTestConstruct(node, SUITE_FUNCTION_NAMES) || isPlaywrightDescribe(context, node.callee)
  );
}

function isTestDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  return Mocha.isTestConstruct(node, TEST_FUNCTION_NAMES) || isPlaywrightTest(context, node.callee);
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
    qualifiers !== undefined &&
    qualifiers[0] === 'describe' &&
    qualifiers.slice(1).every(qualifier => PLAYWRIGHT_MODIFIERS.includes(qualifier))
  );
}

function isPlaywrightTest(context: Rule.RuleContext, callee: estree.Node): boolean {
  const qualifiers = getPlaywrightTestQualifiers(context, callee);
  if (qualifiers === undefined || qualifiers.length === 0) {
    return false;
  }

  return qualifiers.every(qualifier => PLAYWRIGHT_MODIFIERS.includes(qualifier));
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
