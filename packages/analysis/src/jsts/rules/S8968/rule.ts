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
// https://sonarsource.github.io/rspec/#/rspec/S8968/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { FUNCTION_NODES, isIdentifier } from '../helpers/ast.js';
import { isTestCase } from '../helpers/mocha.js';
import * as meta from './generated-meta.js';

const messages = {
  explicitSkip: 'Skip this test explicitly instead of returning early.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      'CallExpression:exit'(node: estree.Node) {
        const call = node as estree.CallExpression;
        const callback = extractCallback(call);
        if (!callback || callback.body.type !== 'BlockStatement') {
          return;
        }

        const statements = callback.body.body;
        if (statements.length < 2 || statements[0].type !== 'IfStatement') {
          return;
        }

        const guard = statements[0];
        if (guard.alternate) {
          return;
        }

        const returnStatement = getSoleReturnWithoutValue(guard.consequent);
        if (returnStatement) {
          context.report({
            node: returnStatement,
            messageId: 'explicitSkip',
          });
        }
      },
    };
  },
};

/**
 * A recognized it/test call's callback, or null. Does not reuse Mocha.extractTestCase,
 * which only looks at argument index 1 and therefore misses the 3-argument
 * `test(name, options, fn)` form used by node:test and Playwright: the callback is
 * always the last argument regardless of how many arguments precede it.
 * Calls already marked `.skip` are ignored: such a test can never be misreported as
 * "passed", since it never runs at all.
 */
function extractCallback(call: estree.CallExpression): estree.Function | null {
  if (!isTestCase(call)) {
    return null;
  }
  if (
    call.callee.type === 'MemberExpression' &&
    !call.callee.computed &&
    isIdentifier(call.callee.property, 'skip')
  ) {
    return null;
  }
  const lastArgument = call.arguments[call.arguments.length - 1];
  return lastArgument && FUNCTION_NODES.includes(lastArgument.type)
    ? (lastArgument as estree.Function)
    : null;
}

/**
 * Returns the `return;` statement if `statement` is exactly that, either directly
 * or as the only statement of a block. A `return` with a value is excluded: it usually
 * returns a promise or a result for an unrelated, legitimate reason. A block with
 * more than one statement is excluded too, since some of those frameworks expect a
 * skip call to be immediately followed by `return;` (e.g. node:test's `t.skip()`).
 */
function getSoleReturnWithoutValue(statement: estree.Statement): estree.ReturnStatement | null {
  if (statement.type === 'ReturnStatement') {
    return statement.argument === null ? statement : null;
  }
  if (statement.type === 'BlockStatement' && statement.body.length === 1) {
    return getSoleReturnWithoutValue(statement.body[0]);
  }
  return null;
}
