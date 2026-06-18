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
// https://sonarsource.github.io/rspec/#/rspec/S8785/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { importsOrDependsOnModule } from '../helpers/module.js';
import { FUNCTION_NODES } from '../helpers/ast.js';
import {
  SUITE_FUNCTION_NAMES,
  SUPPORTED_TEST_FRAMEWORKS,
  isMochaTestConstruct,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const messages = {
  asyncCallback:
    'Make this test suite callback synchronous; move asynchronous setup into a "beforeAll" or "beforeEach" hook.',
  nonFunctionCallback: 'Pass a synchronous function as the test suite callback.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    if (!importsOrDependsOnModule(context, SUPPORTED_TEST_FRAMEWORKS, SUPPORTED_TEST_FRAMEWORKS)) {
      return {};
    }

    return {
      CallExpression(node: estree.CallExpression) {
        if (!isMochaTestConstruct(context, node, SUITE_FUNCTION_NAMES)) {
          return;
        }

        const callback = node.arguments[1];
        if (callback === undefined) {
          // A suite with no callback (e.g. `describe('x')`) is a valid pending suite.
          return;
        }

        if (isFunctionNode(callback)) {
          if (callback.async) {
            context.report({ node: callback, messageId: 'asyncCallback' });
          }
          return;
        }

        if (isDefinitelyNotAFunction(callback)) {
          context.report({ node: callback, messageId: 'nonFunctionCallback' });
        }
      },
    };
  },
};

function isFunctionNode(
  node: estree.Node,
): node is estree.FunctionExpression | estree.ArrowFunctionExpression {
  return FUNCTION_NODES.includes(node.type);
}

/**
 * Conservative check: only values that cannot possibly be a function are flagged. Identifiers,
 * calls, member expressions, etc. may resolve to a function, so they are intentionally skipped.
 */
function isDefinitelyNotAFunction(node: estree.Node): boolean {
  switch (node.type) {
    case 'Literal':
    case 'TemplateLiteral':
    case 'ArrayExpression':
    case 'ObjectExpression':
      return true;
    case 'Identifier':
      return node.name === 'undefined';
    default:
      return false;
  }
}
