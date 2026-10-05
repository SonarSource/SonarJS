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
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Linter, type Rule } from 'eslint';
import type estree from 'estree';
import { rule } from './rule.js';

describe('S8754 helper expansion complexity', () => {
  for (const nestedSuites of [false, true]) {
    for (const staticTitle of [false, true]) {
      it(`bounds leaf visits with nested suites=${nestedSuites}, static title=${staticTitle}`, () => {
        // Thirty helpers calling the next twice describe over a billion runtime invocations,
        // but only thirty distinct bodies. Check work rather than a machine-dependent duration.
        const depth = 30;
        const title = staticTitle ? "'same'" : 'dynamicTitle';
        let code = `import { describe, test } from 'vitest';
function helper0() { test(${title}, () => {}); }
`;
        for (let level = 1; level <= depth; level++) {
          const calls = `helper${level - 1}(); helper${level - 1}();`;
          const body = nestedSuites ? `describe('nested', () => { ${calls} });` : calls;
          code += `function helper${level}() { ${body} }\n`;
        }
        code += `describe('outer', () => helper${depth}());`;

        let leafVisits = 0;
        const probe: Rule.RuleModule = {
          ...rule,
          create(context) {
            const declaration = context.sourceCode.ast.body[1] as estree.FunctionDeclaration;
            const statement = (declaration.body as estree.BlockStatement)
              .body[0] as estree.ExpressionStatement;
            const leaf = statement.expression as estree.CallExpression;
            const args = leaf.arguments;
            Object.defineProperty(leaf, 'arguments', {
              get() {
                // Stop a regression promptly instead of expanding the entire graph in CI.
                assert.ok(++leafVisits <= 200, 'Helper expansion revisited the leaf excessively');
                return args;
              },
            });
            return rule.create(context);
          },
        };
        const messages = new Linter().verify(code, {
          plugins: { test: { rules: { probe } } },
          rules: { 'test/probe': 'error' },
        });
        assert.ok(leafVisits > 0, 'The rule did not examine the helper-defined test');
        assert.equal(messages.length, staticTitle ? 1 : 0);
        for (const message of messages) {
          assert.equal(message.messageId, 'renameDuplicateTitle');
        }
      });
    }
  }
});
