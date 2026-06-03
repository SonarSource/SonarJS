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
// https://sonarsource.github.io/rspec/#/rspec/S8686/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getGlobalExpectCall } from '../helpers/assertions.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import * as Mocha from '../helpers/mocha.js';
import * as meta from './generated-meta.js';

const EXPECT_MODULES = ['vitest', 'bun:test', '@jest/globals', '@playwright/test'];
const EXPECT_GLOBAL_RUNNERS = ['jest', '@playwright/test'];

const conditionalAssertionMessage =
  'Refactor this test so this assertion is always evaluated, or split the test case.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      conditionalAssertion: conditionalAssertionMessage,
    },
  }),
  create(context: Rule.RuleContext) {
    if (!importsOrDependsOnModule(context, EXPECT_MODULES, EXPECT_GLOBAL_RUNNERS)) {
      return {};
    }

    let testCaseDepth = 0;
    let conditionalDepth = 0;
    let suppressedConditionalDepth = 0;
    let promiseCatchDepth = 0;
    let suppressedPromiseCatchDepth = 0;
    const testCases: estree.CallExpression[] = [];
    const conditionals: estree.Node[] = [];
    const catchCallbacks = new WeakSet<estree.Node>();
    const suppressedCatchCallbacks = new WeakSet<estree.Node>();
    const sourceCode = context.sourceCode;

    function enterConditional(node: estree.Node) {
      if (testCaseDepth > 0) {
        conditionalDepth++;
        conditionals.push(node);
        if (isSuppressedConditional(node)) {
          suppressedConditionalDepth++;
        }
      }
    }

    function exitConditional() {
      if (testCaseDepth > 0) {
        const conditional = conditionals.pop();
        if (conditional && isSuppressedConditional(conditional)) {
          suppressedConditionalDepth--;
        }
        conditionalDepth--;
      }
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (Mocha.isTestCase(node)) {
          testCaseDepth++;
          testCases.push(node);
        }
        if (isCatchCall(node)) {
          const [callback] = node.arguments;
          if (isFunctionNode(callback)) {
            catchCallbacks.add(callback);
            if (isSuppressedPromiseCatch(callback)) {
              suppressedCatchCallbacks.add(callback);
            }
          }
        }
        const expectCall = getGlobalExpectCall(node);
        if (expectCall && testCaseDepth > 0 && isConditional() && !isSuppressed()) {
          context.report({
            node: expectCall,
            messageId: 'conditionalAssertion',
          });
        }
      },
      'CallExpression:exit'(node: estree.CallExpression) {
        if (Mocha.isTestCase(node)) {
          testCaseDepth--;
          testCases.pop();
          if (testCaseDepth === 0) {
            conditionalDepth = 0;
            suppressedConditionalDepth = 0;
            promiseCatchDepth = 0;
            suppressedPromiseCatchDepth = 0;
            conditionals.length = 0;
          }
        }
      },
      IfStatement: enterConditional,
      'IfStatement:exit': exitConditional,
      SwitchStatement: enterConditional,
      'SwitchStatement:exit': exitConditional,
      ConditionalExpression: enterConditional,
      'ConditionalExpression:exit': exitConditional,
      LogicalExpression: enterConditional,
      'LogicalExpression:exit': exitConditional,
      CatchClause: enterConditional,
      'CatchClause:exit': exitConditional,
      ':function'(node: estree.Node) {
        if (catchCallbacks.has(node)) {
          promiseCatchDepth++;
          if (suppressedCatchCallbacks.has(node)) {
            suppressedPromiseCatchDepth++;
          }
        }
      },
      ':function:exit'(node: estree.Node) {
        if (catchCallbacks.has(node)) {
          promiseCatchDepth--;
          if (suppressedCatchCallbacks.has(node)) {
            suppressedPromiseCatchDepth--;
          }
        }
      },
    };

    function isConditional(): boolean {
      return conditionalDepth > 0 || promiseCatchDepth > 0;
    }

    function isSuppressed(): boolean {
      return (
        (promiseCatchDepth > 0 && suppressedPromiseCatchDepth > 0) ||
        suppressedConditionalDepth > 0
      );
    }

    function isSuppressedPromiseCatch(callback: estree.Node): boolean {
      const callbackText = sourceCode.getText(callback);
      const testText = currentTestCaseText();
      return hasFailureSentinel(callbackText) || hasAssertionCount(testText);
    }

    function isSuppressedConditional(conditional: estree.Node): boolean {
      if (conditional.type === 'CatchClause') {
        return isExpectedErrorCatch(conditional);
      }
      return false;
    }

    function currentTestCaseText(): string {
      const currentTestCase = testCases.at(-1);
      return currentTestCase ? sourceCode.getText(currentTestCase) : '';
    }

    function isExpectedErrorCatch(catchClause: estree.CatchClause): boolean {
      const catchText = sourceCode.getText(catchClause);
      const tryStatement = (catchClause as estree.CatchClause & { parent?: estree.TryStatement })
        .parent;
      const tryText = tryStatement?.type === 'TryStatement' ? sourceCode.getText(tryStatement) : '';
      const testText = currentTestCaseText();

      return (
        hasFailureSentinel(catchText) ||
        hasFailureSentinel(tryText) ||
        hasUnreachableAssertion(tryText) ||
        countExpectCalls(catchText) > 1 ||
        hasAssertionCount(testText) ||
        /expect\s*\(\s*\w*error\w*\s*\)\s*\.toBe\s*\(\s*true\s*\)/iu.test(testText) ||
        /\bexpected\w*error\b/iu.test(catchText) ||
        /expect\s*\(\s*\w+\s*\)\s*\.toBe\s*\(\s*null\s*\)/u.test(testText)
      );
    }
  },
};

function hasFailureSentinel(text: string): boolean {
  return (
    /expect\s*\(\s*false\s*\)\s*\.toBe\s*\(\s*true\s*\)/u.test(text) ||
    /expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*false\s*\)/u.test(text)
  );
}

function hasAssertionCount(text: string): boolean {
  return /expect\.(?:assertions|hasAssertions)\s*\(/u.test(text);
}

function hasUnreachableAssertion(text: string): boolean {
  return /\bexpect\.unreachable\s*\(/u.test(text);
}

function countExpectCalls(text: string): number {
  return text.match(/\bexpect(?:\.\w+)?\s*\(/gu)?.length ?? 0;
}

function isEnvironmentOrMatrixText(text: string): boolean {
  return [
    '__WIN32__',
    'process.platform',
    'process.env',
    'import.meta.env',
    'server.provider',
    'server.platform',
    'provider.name',
    'browser',
    'browsers',
    'instances',
    'traceFile',
    'osPlatform',
    'rolldownVersion',
    'viteVersion',
    'isVm',
    'isV8Provider',
    'isBrowser',
    'isNativeRunner',
    'config.pool',
    'project',
    'task.file.projectName',
    'locale',
    'CI',
  ].some(marker => text.includes(marker));
}

function isCatchCall(node: estree.CallExpression): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'catch'
  );
}

function isFunctionNode(
  node: unknown,
): node is estree.FunctionExpression | estree.ArrowFunctionExpression {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')
  );
}
