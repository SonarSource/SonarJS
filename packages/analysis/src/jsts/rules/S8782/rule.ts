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
// https://sonarsource.github.io/rspec/#/rspec/S8782/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { FUNCTION_NODES } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isDescribeCase, isLifecycleHook, isTestCase } from '../helpers/mocha.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      moveHook: 'Move this hook above the test cases in the same scope.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.CallExpression) {
        if (!isDescribeCase(node)) {
          return;
        }
        const callback = node.arguments[1];
        if (!callback || !FUNCTION_NODES.includes(callback.type)) {
          return;
        }
        const body = (callback as estree.Function).body;
        if (body.type !== 'BlockStatement') {
          return;
        }

        let seenTestCase = false;
        for (const stmt of body.body) {
          if (stmt.type !== 'ExpressionStatement') {
            continue;
          }
          const expr = stmt.expression;
          if (expr.type !== 'CallExpression') {
            continue;
          }
          if (isTestCase(expr)) {
            seenTestCase = true;
          } else if (seenTestCase && isLifecycleHook(expr)) {
            const callee = expr.callee;
            context.report({
              node: callee.type === 'MemberExpression' ? callee.object : callee,
              messageId: 'moveHook',
            });
          }
        }
      },
    };
  },
};
