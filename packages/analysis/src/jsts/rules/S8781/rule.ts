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
// https://sonarsource.github.io/rspec/#/rspec/S8781/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import {
  PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER,
  PLAYWRIGHT_DESCRIBE_MODIFIERS,
  PLAYWRIGHT_TEST_MODIFIERS,
  SUITE_FUNCTION_NAMES,
  SUPPORTED_TEST_FRAMEWORKS,
  TEST_FUNCTION_NAMES,
  getPlaywrightDescribeQualifiers,
  getPlaywrightTestQualifiers,
  getStaticTitle,
  hasCallback,
  isMochaTestConstruct,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const MOCHA_TEST_AND_SUITE_NAMES = [...TEST_FUNCTION_NAMES, ...SUITE_FUNCTION_NAMES];

const MESSAGE = 'Replace this empty or whitespace-only title with a descriptive name.';
const MESSAGE_ID = 'emptyTitle';

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

    return {
      CallExpression(node: estree.CallExpression) {
        if (isTestOrSuiteDeclaration(context, node)) {
          checkTitle(context, node);
        }
      },
    };
  },
};

function checkTitle(context: Rule.RuleContext, node: estree.CallExpression) {
  const titleNode = node.arguments[0];
  const title = titleNode && getStaticTitle(titleNode);
  if (title?.trim() === '') {
    context.report({
      node: titleNode,
      messageId: MESSAGE_ID,
    });
  }
}

function isTestOrSuiteDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  if (!hasCallback(node)) {
    return false;
  }
  return (
    isMochaTestConstruct(context, node, MOCHA_TEST_AND_SUITE_NAMES) ||
    isPlaywrightTest(context, node) ||
    isPlaywrightDescribe(context, node)
  );
}

function isPlaywrightTest(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  const qualifiers = getPlaywrightTestQualifiers(context, node.callee);
  return (
    qualifiers !== undefined &&
    qualifiers.every(qualifier => PLAYWRIGHT_TEST_MODIFIERS.has(qualifier))
  );
}

function isPlaywrightDescribe(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  const qualifiers =
    getPlaywrightTestQualifiers(context, node.callee) ??
    getPlaywrightDescribeQualifiers(node.callee);
  if (qualifiers?.[0] !== 'describe') {
    return false;
  }

  const modifiers = qualifiers.slice(1);
  const runnableModifiers =
    modifiers.at(-1) === PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER ? modifiers.slice(0, -1) : modifiers;
  return runnableModifiers.every(modifier => PLAYWRIGHT_DESCRIBE_MODIFIERS.has(modifier));
}
