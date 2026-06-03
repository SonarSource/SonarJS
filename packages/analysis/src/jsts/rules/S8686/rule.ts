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
    let promiseCatchDepth = 0;

    function enterConditional() {
      if (testCaseDepth > 0) {
        conditionalDepth++;
      }
    }

    function exitConditional() {
      if (testCaseDepth > 0) {
        conditionalDepth--;
      }
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (Mocha.isTestCase(node)) {
          testCaseDepth++;
        }
        if (isCatchCall(node)) {
          promiseCatchDepth++;
        }
        if (isExpectCall(node) && testCaseDepth > 0 && isConditional()) {
          context.report({
            node: node.callee,
            messageId: 'conditionalAssertion',
          });
        }
      },
      'CallExpression:exit'(node: estree.CallExpression) {
        if (isCatchCall(node)) {
          promiseCatchDepth--;
        }
        if (Mocha.isTestCase(node)) {
          testCaseDepth--;
          if (testCaseDepth === 0) {
            conditionalDepth = 0;
            promiseCatchDepth = 0;
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
    };

    function isConditional(): boolean {
      return conditionalDepth > 0 || promiseCatchDepth > 0;
    }
  },
};

function isExpectCall(node: estree.CallExpression): boolean {
  return node.callee.type === 'Identifier' && node.callee.name.startsWith('expect');
}

function isCatchCall(node: estree.CallExpression): boolean {
  return (
    node.callee.type === 'MemberExpression' &&
    !node.callee.computed &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'catch'
  );
}
