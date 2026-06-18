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
import { importsModule, importsOrDependsOnModule } from '../helpers/module.js';
import { FUNCTION_NODES } from '../helpers/ast.js';
import {
  SUITE_FUNCTION_NAMES,
  SUPPORTED_TEST_FRAMEWORKS,
  isMochaTestConstruct,
} from '../helpers/mocha-style-test-frameworks.js';
import * as meta from './generated-meta.js';

const VITEST = 'vitest';

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

        // Arguments after the suite name. The callback is the function among them: it may not be
        // the second argument, e.g. Vitest/Jest also accept `describe(name, options, fn)`.
        const args = node.arguments.slice(1);
        if (args.length === 0) {
          // A suite with no callback (e.g. `describe('x')`) is a valid pending suite.
          return;
        }

        const callback = args.find(isFunctionNode);
        if (callback === undefined) {
          // No function argument at all: the callback slot holds a non-function value.
          const lastArg = args.at(-1);
          if (lastArg && isDefinitelyNotAFunction(lastArg)) {
            context.report({ node: lastArg, messageId: 'nonFunctionCallback' });
          }
          return;
        }
        if (callback.async && !isVitestSuite(context)) {
          // Vitest awaits the suite callback, so an async callback there is safe (tests declared
          // after an `await` are still collected). Jest and Mocha do not, which is the actual bug.
          context.report({ node: callback, messageId: 'asyncCallback' });
        }
      },
    };
  },
};

/**
 * Whether the suites in this file belong to Vitest, where an async suite callback is safe. A file
 * that imports/requires Vitest is using Vitest; otherwise (globals) we infer from the project's
 * declared frameworks, treating it as Vitest only when Vitest is present and Jest/Mocha are not.
 */
function isVitestSuite(context: Rule.RuleContext): boolean {
  if (importsModule(context, [VITEST])) {
    return true;
  }

  return (
    importsOrDependsOnModule(context, [VITEST], [VITEST]) &&
    !importsOrDependsOnModule(context, ['jest', 'mocha'], ['jest', 'mocha'])
  );
}

function isFunctionNode(
  node: estree.Node,
): node is estree.FunctionExpression | estree.ArrowFunctionExpression {
  return FUNCTION_NODES.includes(node.type);
}

/**
 * Conservative check: only values that cannot possibly be a function are flagged. Identifiers,
 * calls, member expressions, etc. may resolve to a function, so they are intentionally skipped.
 * Object expressions are skipped too, as they are a plausible options argument (Vitest/Jest accept
 * `describe(name, options, fn)`).
 */
function isDefinitelyNotAFunction(node: estree.Node): boolean {
  switch (node.type) {
    case 'Literal':
    case 'TemplateLiteral':
    case 'ArrayExpression':
      return true;
    case 'Identifier':
      return node.name === 'undefined';
    default:
      return false;
  }
}
