/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rules } from '../external/unicorn.js';
import { rule } from './index.js';
import { decorate } from './decorator.js';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import { Linter } from 'eslint';
import type { Rule } from 'eslint';
import assert from 'node:assert';

describe('S7778', () => {
  it('S7778', () => {
    const noTypeCheckingRuleTester = new DefaultParserRuleTester();
    noTypeCheckingRuleTester.run('Conservative fallback without type information', rule, {
      valid: [],
      invalid: [
        {
          code: `
const items = [];
items.push(1);
items.push(2);
`,
          output: `
const items = [];
items.push(1, 2);
`,
          errors: 1,
        },
        {
          code: `
importScripts('a.js');
importScripts('b.js');
`,
          output: `
importScripts('a.js', 'b.js');
`,
          errors: 1,
        },
      ],
    });

    const ruleTester = new RuleTester();
    ruleTester.run('Combine consecutive method calls', rule, {
      valid: [
        {
          // https://community.sonarsource.com/t/typescript-s7778-incorrectly-reporting-on-methods-that-dont-accept-multiple-arguments/179057
          code: `
class CustomClass {
  push(item: number): void {}
}
const instance = new CustomClass();
instance.push(1);
instance.push(2); // Compliant: not an Array
`,
        },
        {
          code: `
class CustomTokenList {
  add(token: string): void {}
  remove(token: string): void {}
}
class VirtualElement {
  readonly classList = new CustomTokenList();
}
const el = new VirtualElement();
el.classList.add('active');
el.classList.add('visible'); // Compliant: not a DOMTokenList
el.classList.remove('hidden');
el.classList.remove('inactive'); // Compliant: not a DOMTokenList
`,
        },
        {
          // importScripts declared with zero parameters → calleeAcceptsMultipleArguments returns false → suppressed
          // Covers the CallExpression parent path (lines 63-64) and the zero-params early return (line 90)
          code: `
declare function importScripts(): void;
importScripts();
importScripts();
`,
        },
      ],
      invalid: [
        {
          code: `
const items: number[] = [];
items.push(1);
items.push(2);
`,
          output: `
const items: number[] = [];
items.push(1, 2);
`,
          errors: 1,
        },
        {
          code: `
const element = document.createElement('div');
element.classList.add('foo');
element.classList.add('bar');
`,
          output: `
const element = document.createElement('div');
element.classList.add('foo', 'bar');
`,
          errors: 1,
        },
        {
          code: `
const element = document.createElement('div');
element.classList.remove('foo');
element.classList.remove('bar');
`,
          output: `
const element = document.createElement('div');
element.classList.remove('foo', 'bar');
`,
          errors: 1,
        },
        {
          code: `
const obj = { items: [] };
obj.items.push(1);
obj.items.push(2);
`,
          output: `
const obj = { items: [] };
obj.items.push(1, 2);
`,
          errors: 1,
        },
        {
          // A custom class with a variadic push can legitimately be combined
          code: `
class CustomPusher {
  push(...items: any[]): void {}
}
const pusher = new CustomPusher();
pusher.push(1);
pusher.push(2);
`,
          output: `
class CustomPusher {
  push(...items: any[]): void {}
}
const pusher = new CustomPusher();
pusher.push(1, 2);
`,
          errors: 1,
        },
        {
          // importScripts with rest params declared via TypeScript → callee accepts multiple args → reported
          // Covers the CallExpression parent path (lines 63-64) where the reported node is the callee Identifier
          code: `
declare function importScripts(...urls: string[]): void;
importScripts('a.js');
importScripts('b.js');
`,
          output: `
declare function importScripts(...urls: string[]): void;
importScripts('a.js', 'b.js');
`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7778 upstream canary', () => {
  it('upstream prefer-single-call should still report on custom class with single-arg push', () => {
    // This test uses the upstream unicorn prefer-single-call rule directly,
    // without the SonarJS decorator. It expects the upstream rule to still flag
    // consecutive calls to a custom class push() method that accepts only a single
    // argument — this is the false positive that the S7778 decorator suppresses.
    //
    // If the upstream rule is later improved to use TypeScript type information and
    // suppress reports on non-Array types, this test will fail — that is the signal
    // to remove the SonarJS decorator.
    const upstreamRuleTester = new NoTypeCheckingRuleTester();
    upstreamRuleTester.run('prefer-single-call', rules['prefer-single-call'], {
      valid: [],
      invalid: [
        {
          code: `
class CustomClass { push(item: number): void {} }
const instance = new CustomClass();
instance.push(1);
instance.push(2);
`,
          output: `
class CustomClass { push(item: number): void {} }
const instance = new CustomClass();
instance.push(1, 2);
`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7778 decorator TypeScript else-fallback', () => {
  it('should pass through report when TypeScript is available but node parent is neither MemberExpression nor CallExpression', () => {
    // When TypeScript services are available but the reported node's parent is neither
    // a MemberExpression nor a CallExpression, the decorator falls through to the else
    // branch and forwards the report unchanged (lines 66-67 in decorator.ts).
    const mockRuleWithLiteral: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(ctx) {
        return {
          Literal(node) {
            ctx.report({ node, message: 'else-fallback forwarded' });
          },
        };
      },
    };
    const tsRuleTester = new RuleTester();
    tsRuleTester.run('else-fallback-ts', decorate(mockRuleWithLiteral), {
      valid: [],
      invalid: [
        {
          // Literal `42` has parent ExpressionStatement — not MemberExpression or CallExpression
          code: `42;`,
          errors: [{ message: 'else-fallback forwarded' }],
        },
      ],
    });
  });
});

describe('S7778 decorator edge cases', () => {
  it('should pass through descriptor without a node property', () => {
    // When the descriptor has no 'node' property,
    // the decorator forwards it as-is without attempting to filter.
    const mockUpstream: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(ctx) {
        return {
          Program(node) {
            // Report using loc instead of node — exercises !('node' in descriptor) branch
            (ctx as any).report({ loc: node.loc!, message: 'no-node descriptor forwarded' });
          },
        };
      },
    };
    const decorated = decorate(mockUpstream);
    const linter = new Linter();
    const messages = linter.verify('const x = 1;', {
      plugins: { test: { rules: { r: decorated } } },
      rules: { 'test/r': 'error' },
    });
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].message, 'no-node descriptor forwarded');
  });

  it('should pass through descriptor when reported node parent is not a CallExpression or MemberExpression', () => {
    // When the descriptor has a node but its parent is neither a CallExpression
    // nor a MemberExpression, the decorator forwards it.
    // Here the `val` Identifier in `const x = val` has parent VariableDeclarator.
    const mockUpstream: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(ctx) {
        return {
          Identifier(node) {
            if (node.name === 'val') {
              ctx.report({ node, message: 'non-call/member parent forwarded' });
            }
          },
        };
      },
    };
    const decorated = decorate(mockUpstream);
    const linter = new Linter();
    const messages = linter.verify('const x = val;', {
      plugins: { test: { rules: { r: decorated } } },
      rules: { 'test/r': 'error' },
    });
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].message, 'non-call/member parent forwarded');
  });
});
