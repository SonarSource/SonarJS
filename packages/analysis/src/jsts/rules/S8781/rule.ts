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
import {
  FUNCTION_NODES,
  getVariableFromScope,
  isIdentifier,
  isStaticTemplateLiteral,
  isStringLiteral,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName, importsOrDependsOnModule } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const SUPPORTED_TEST_FRAMEWORKS = ['jest', 'mocha', 'vitest', '@playwright/test'];
const MOCHA_STYLE_TEST_FRAMEWORKS = new Set(['jest', 'mocha', 'vitest']);
const TEST_FUNCTION_NAMES = ['it', 'specify', 'test'];
const SUITE_FUNCTION_NAMES = ['describe', 'context', 'suite'];
const COMMON_MOCHA_TEST_MODIFIERS = new Set(['only', 'concurrent']);
const JEST_TEST_MODIFIERS = new Set(['failing']);
const VITEST_TEST_MODIFIERS = new Set(['sequential']);
const PLAYWRIGHT_TEST_FQN = '@playwright.test.test';
const PLAYWRIGHT_TEST_MODIFIERS = new Set(['only', 'fail']);
const PLAYWRIGHT_DESCRIBE_MODIFIERS = new Set(['parallel', 'serial']);
const PLAYWRIGHT_DESCRIBE_FOCUS_MODIFIER = 'only';
const MESSAGE = 'Replace this empty test title with a descriptive name.';
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
  if (title !== undefined && title.trim() === '') {
    context.report({
      node: titleNode,
      messageId: MESSAGE_ID,
    });
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

function isTestOrSuiteDeclaration(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  return (
    isMochaTestConstruct(context, node, TEST_FUNCTION_NAMES) ||
    isMochaTestConstruct(context, node, SUITE_FUNCTION_NAMES) ||
    isPlaywrightTest(context, node) ||
    isPlaywrightDescribe(context, node)
  );
}

function isMochaTestConstruct(
  context: Rule.RuleContext,
  node: estree.CallExpression,
  constructs: string[],
): boolean {
  if (!hasCallback(node)) {
    return false;
  }

  const calleeParts = getMochaCalleeParts(node.callee);
  if (calleeParts === undefined) {
    return false;
  }

  const constructName = getMochaConstructName(context, calleeParts.base);
  if (constructName === undefined || !constructs.includes(constructName)) {
    return false;
  }

  return calleeParts.modifiers.every(modifier => isConcreteMochaTestModifier(context, modifier));
}

function isConcreteMochaTestModifier(context: Rule.RuleContext, modifier: string): boolean {
  return (
    COMMON_MOCHA_TEST_MODIFIERS.has(modifier) ||
    (JEST_TEST_MODIFIERS.has(modifier) && isTestFrameworkActive(context, 'jest')) ||
    (VITEST_TEST_MODIFIERS.has(modifier) && isTestFrameworkActive(context, 'vitest'))
  );
}

function isTestFrameworkActive(context: Rule.RuleContext, framework: string): boolean {
  return importsOrDependsOnModule(context, [framework], [framework]);
}

function getMochaCalleeParts(
  node: estree.Node,
): { base: estree.Identifier; modifiers: string[] } | undefined {
  const modifiers: string[] = [];
  let current = node;
  while (true) {
    if (current.type === 'CallExpression') {
      current = current.callee;
    } else if (isQualifyingMember(current)) {
      modifiers.unshift(current.property.name);
      current = current.object;
    } else {
      break;
    }
  }
  return current.type === 'Identifier' ? { base: current, modifiers } : undefined;
}

function collectMemberChain(node: estree.Node): { base: estree.Node; qualifiers: string[] } {
  const qualifiers: string[] = [];
  let current = node;
  while (isQualifyingMember(current)) {
    qualifiers.unshift(current.property.name);
    current = current.object;
  }
  return { base: current, qualifiers };
}

function isQualifyingMember(
  node: estree.Node,
): node is estree.MemberExpression & { property: estree.Identifier } {
  return node.type === 'MemberExpression' && !node.computed && isIdentifier(node.property);
}

function hasCallback(node: estree.CallExpression): boolean {
  return node.arguments.some(argument => FUNCTION_NODES.includes(argument.type));
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

function isPlaywrightTest(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  if (!hasCallback(node)) {
    return false;
  }

  const qualifiers = getPlaywrightTestQualifiers(context, node.callee);
  return (
    qualifiers !== undefined &&
    qualifiers.every(qualifier => PLAYWRIGHT_TEST_MODIFIERS.has(qualifier)) &&
    (!qualifiers.includes('fail') || hasCallback(node))
  );
}

function isPlaywrightDescribe(context: Rule.RuleContext, node: estree.CallExpression): boolean {
  if (!hasCallback(node)) {
    return false;
  }

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

function getPlaywrightTestQualifiers(
  context: Rule.RuleContext,
  node: estree.Node,
): string[] | undefined {
  const { base, qualifiers } = collectMemberChain(node);
  return getFullyQualifiedName(context, base) === PLAYWRIGHT_TEST_FQN ? qualifiers : undefined;
}

function getPlaywrightDescribeQualifiers(node: estree.Node): string[] | undefined {
  const { base, qualifiers } = collectMemberChain(node);
  return isIdentifier(base, 'test') ? qualifiers : undefined;
}
