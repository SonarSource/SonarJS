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
// https://sonarsource.github.io/rspec/#/rspec/S2187/javascript

import type { Rule } from 'eslint';
import type { CallExpression, Node } from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { hasStringFirstArgument } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

const TEST_FILE_PATTERN = /\.(?:spec|test|cy)\./;

const APIs = new Set([
  // Jasmine test cases: it(...), fit(...), xit(...).
  'it',
  'fit',
  'xit',
  // Jest test cases: test(...), it.only(...), test.concurrent.each(...).
  'it',
  'it.concurrent',
  'it.concurrent.only',
  'it.concurrent.skip',
  'it.concurrent.each',
  'it.concurrent.only.each',
  'it.concurrent.skip.each',
  'it.each',
  'it.failing',
  'it.failing.each',
  'it.only.failing',
  'it.skip.failing',
  'it.only',
  'it.only.each',
  'it.skip',
  'it.skip.each',
  'it.todo',
  'test',
  'test.concurrent',
  'test.concurrent.only',
  'test.concurrent.skip',
  'test.concurrent.each',
  'test.concurrent.only.each',
  'test.concurrent.skip.each',
  'test.each',
  'test.failing',
  'test.failing.each',
  'test.only.failing',
  'test.skip.failing',
  'test.only',
  'test.only.each',
  'test.skip.each',
  'test.todo',
  // Mocha and Cypress test cases
  'it',
  'it.skip',
  'it.only',
  'specify',
  'specify.skip',
  'specify.only',
  'xspecify',
  'test',
  'test.only',
  // Node.js test runner
  'it',
  'it.skip',
  'it.todo',
  'it.only',
  'test',
  'test.todo',
  'test.only',
  // vitest
  'test.runIf',
  'it.runIf',
  'test.skipIf',
  'it.skipIf',
  'test.fails',
  'it.fails',
  'test.fails.each',
  'it.fails.each',
  'test.sequential',
  'it.sequential',
  'test.sequential.each',
  'it.sequential.each',
  'test.for',
  'it.for',
  // @fast-check/vitest (property-based testing)
  'test.prop',
  'it.prop',
  // eslint rule tester
  'ruleTester.run',
]);

const APIS_WITH_TEST_TITLE = new Set([
  // These APIs are overloaded for both test declarations and runtime annotations.
  // Count only declaration-style calls with a string title: test.skip('title', ...).
  // see https://playwright.dev/docs/api/class-test#test-skip
  'test.skip',
  'test.fail',
  'test.fail.only',
  'test.fixme',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      missingTest: 'Add some tests to this file or delete it.',
    },
  }),
  create(context: Rule.RuleContext) {
    const { filename } = context;
    if (!TEST_FILE_PATTERN.test(filename)) {
      return {};
    }

    let hasTest = false;

    function checkIfTestCall(node: CallExpression) {
      if (hasTest) {
        return;
      }

      const fqn = fullyQualifiedName(node.callee);
      if (APIs.has(fqn) || (APIS_WITH_TEST_TITLE.has(fqn) && hasStringFirstArgument(node))) {
        hasTest = true;
      }
    }

    function checkIfTestTag(node: Node) {
      if (hasTest) {
        return;
      }

      if (APIs.has(fullyQualifiedName(node))) {
        hasTest = true;
      }
    }

    return {
      CallExpression(node) {
        checkIfTestCall(node);
      },
      TaggedTemplateExpression(node) {
        checkIfTestTag(node.tag);
      },
      'Program:exit'() {
        if (!hasTest) {
          context.report({
            messageId: 'missingTest',
            loc: { line: 0, column: 0 },
          });
        }
      },
    };
  },
};

function fullyQualifiedName(node: Node): string {
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'MemberExpression':
      return `${fullyQualifiedName(node.object)}.${fullyQualifiedName(node.property)}`;
    default:
      return '';
  }
}
