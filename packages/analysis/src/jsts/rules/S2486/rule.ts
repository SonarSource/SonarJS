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
// https://sonarsource.github.io/rspec/#/rspec/S2486/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { getParent } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getVariableFromScope } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

const LOOP_OR_SWITCH_TYPES = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'SwitchStatement',
]);

function isSingleSimpleStatement(body: estree.Statement[]): boolean {
  if (body.length !== 1) {
    return false;
  }
  let stmt = body[0];
  while (stmt.type === 'LabeledStatement') {
    stmt = (stmt as estree.LabeledStatement).body;
  }
  return !LOOP_OR_SWITCH_TYPES.has(stmt.type);
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      handleException: "Handle this exception or don't catch it at all.",
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'CatchClause[param.type="Identifier"]'(node: estree.CatchClause) {
        const param = node.param as estree.Identifier;
        const scope = context.sourceCode.getScope(node);
        const variable = getVariableFromScope(scope, param.name);
        if (variable?.references.length === 0) {
          const tryStatement = getParent(context, node) as estree.TryStatement;
          if (!isSingleSimpleStatement(tryStatement.block.body)) {
            context.report({
              messageId: 'handleException',
              node,
            });
          }
        }
      },
    };
  },
};
