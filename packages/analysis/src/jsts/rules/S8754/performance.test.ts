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
  it('skips assertion resolution and summarizes a large helper once across suites', () => {
    const statements = 100;
    const suites = 100;
    let code = `import { describe, test } from 'vitest';
function helper() { ${'unrelated();'.repeat(statements)} test('unique', () => {}); }
test('body', () => { ${'expect(value).toBe(value);'.repeat(statements)} });
`;
    for (let suite = 0; suite < suites; suite++) {
      code += `describe('suite${suite}', () => helper());\n`;
    }

    const scopeQueries = new Map<string, number>();
    const probe: Rule.RuleModule = {
      ...rule,
      create(context) {
        const sourceCode = new Proxy(context.sourceCode, {
          get(target, property) {
            if (property === 'getScope') {
              return (node: estree.Node) => {
                if (node.type === 'Identifier') {
                  scopeQueries.set(node.name, (scopeQueries.get(node.name) ?? 0) + 1);
                }
                return target.getScope(node);
              };
            }
            return Reflect.get(target, property);
          },
        });
        const instrumentedContext = Object.create(context) as Rule.RuleContext;
        Object.defineProperty(instrumentedContext, 'sourceCode', { value: sourceCode });
        return rule.create(instrumentedContext);
      },
    };
    const messages = new Linter().verify(code, {
      plugins: { test: { rules: { probe } } },
      rules: { 'test/probe': 'error' },
    });

    assert.equal(messages.length, 0);
    assert.equal(scopeQueries.get('expect') ?? 0, 0, 'Calls inside test bodies were resolved');
    const unrelatedQueries = scopeQueries.get('unrelated') ?? 0;
    assert.ok(unrelatedQueries > 0, 'The helper body was not examined');
    assert.ok(
      unrelatedQueries <= statements * 4,
      'Helper statements were resolved repeatedly across suites or on call exit',
    );
  });

  for (const nestedSuites of [false, true]) {
    for (const staticTitle of [false, true]) {
      for (const recursion of ['none', 'self', 'mutual']) {
        it(`bounds leaf visits with nested suites=${nestedSuites}, static title=${staticTitle}, recursion=${recursion}`, () => {
          // Thirty helpers calling the next twice describe over a billion runtime invocations,
          // but only thirty distinct bodies. Check work rather than a machine-dependent duration.
          const depth = 30;
          const title = staticTitle ? "'same'" : 'dynamicTitle';
          const recursiveCall =
            recursion === 'self' ? 'helper0();' : recursion === 'mutual' ? 'partner();' : '';
          let code = `import { describe, test } from 'vitest';
function helper0() { test(${title}, () => {}); ${recursiveCall} }
`;
          if (recursion === 'mutual') {
            code += 'function partner() { helper0(); }\n';
          }
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
  }
});
