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
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { describe, it } from 'node:test';
import path from 'node:path';
import type { Rule } from 'eslint';

const upstreamRule = tsEslintRules['prefer-optional-chain'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our fix suppresses.
// If this test starts failing, the interceptor can be safely removed.
describe('S6582 upstream sentinel', () => {
  it('upstream prefer-optional-chain raises on typed-context patterns that our fix suppresses', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    ruleTester.run('prefer-optional-chain', upstreamRule, {
      valid: [],
      invalid: [
        {
          // return type 'number | null' excludes undefined — suppressed by fix, raised by upstream
          code: `function getLen(arr: string[] | null): number | null { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // variable typed as 'number | null' excludes undefined — suppressed by fix, raised by upstream
          code: `function f(a: number[] | null) { const x: number | null = a && a.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});

describe('S6582 defensive guard fallback paths', () => {
  const fixtureFile = path.join(import.meta.dirname, 'fixtures/index.ts');
  const ruleTesterOptions = {
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
    },
  };
  // Code that reliably triggers prefer-optional-chain in a boolean context (no suppression normally)
  const triggerCode = `function f(arr: string[] | null) { if (arr && arr.length) {} }`;

  it('reports when report descriptor has no loc (defensive !loc fallback)', () => {
    const noLocRule: Rule.RuleModule = {
      meta: rule.meta,
      create(context) {
        const originalCreate = upstreamRule.create;
        upstreamRule.create = interceptedContext => ({
          LogicalExpression(node) {
            interceptedContext.report({
              node,
              message:
                'Prefer using an optional chain expression instead, as it is more concise and easier to read.',
            });
          },
        });

        try {
          return rule.create(context);
        } finally {
          upstreamRule.create = originalCreate;
        }
      },
    };

    const ruleTester = new RuleTester(ruleTesterOptions);
    ruleTester.run('S6582-no-loc', noLocRule, {
      valid: [],
      invalid: [{ code: triggerCode, filename: fixtureFile, errors: 1 }],
    });
  });

  it('reports when getNodeByRangeIndex returns null (defensive !node fallback)', () => {
    // Wrap sourceCode in a Proxy that overrides getNodeByRangeIndex to return null.
    // The S6582 callback falls back to ctx.report when it can't find the AST node,
    // exercising the defensive guard at lines 84-85 of rule.ts.
    const noNodeRule: Rule.RuleModule = {
      meta: rule.meta,
      create(context) {
        // Use Proxy to intercept getNodeByRangeIndex without mutating the non-extensible
        // sourceCode object. Reflect.get(target, prop, target) is used for all other
        // properties to satisfy Proxy invariants for non-configurable data properties.
        const wrappedSourceCode = new Proxy(context.sourceCode, {
          get(target, prop) {
            if (prop === 'getNodeByRangeIndex') return () => null;
            return Reflect.get(target, prop, target);
          },
        });
        // Use Reflect.get(target, prop, receiver) for the context proxy so that
        // non-configurable data properties (like 'report') satisfy Proxy invariants.
        const wrappedContext = new Proxy(context, {
          get(target, prop, receiver) {
            if (prop === 'sourceCode') return wrappedSourceCode;
            return Reflect.get(target, prop, receiver);
          },
        });
        return rule.create(wrappedContext as Rule.RuleContext);
      },
    };

    const ruleTester = new RuleTester(ruleTesterOptions);
    ruleTester.run('S6582-no-node', noNodeRule, {
      valid: [],
      invalid: [{ code: triggerCode, filename: fixtureFile, errors: 1 }],
    });
  });

  it('reports when esTreeNodeToTSNodeMap.get returns undefined (defensive !tsNode fallback)', () => {
    // Patch esTreeNodeToTSNodeMap.get to return undefined for LogicalExpression nodes.
    // The S6582 callback walks the AST up to the LogicalExpression and looks it up;
    // the upstream rule looks up Identifier/MemberExpression nodes for type checking.
    // Returning undefined only for LogicalExpression exercises the guard at lines 93-94 of rule.ts
    // while leaving the upstream rule's type checks unaffected.
    const noTsNodeRule: Rule.RuleModule = {
      meta: rule.meta,
      create(context) {
        const services = context.sourceCode.parserServices;
        if (services?.esTreeNodeToTSNodeMap) {
          const origGet = services.esTreeNodeToTSNodeMap.get.bind(services.esTreeNodeToTSNodeMap);
          services.esTreeNodeToTSNodeMap.get = (node: Rule.Node) => {
            if (node.type === 'LogicalExpression') return undefined;
            return origGet(node);
          };
        }
        return rule.create(context);
      },
    };

    const ruleTester = new RuleTester(ruleTesterOptions);
    ruleTester.run('S6582-no-ts-node', noTsNodeRule, {
      valid: [],
      invalid: [{ code: triggerCode, filename: fixtureFile, errors: 1 }],
    });
  });
});

describe('S6582 with strict: true (no explicit strictNullChecks)', () => {
  it('suppresses false positives when only strict: true is set — strict implies strictNullChecks', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures/strict-mode'),
      },
    });
    ruleTester.run('S6582', rule, {
      valid: [
        {
          // FP: return type 'number | null' excludes undefined — strict: true implies strictNullChecks
          code: `function getLen(arr: string[] | null): number | null { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/strict-mode/index.ts'),
        },
      ],
      invalid: [
        {
          // boolean context (if-condition): no contextual type — optional chaining is type-safe
          code: `function f(arr: string[] | null) { if (arr && arr.length) {} }`,
          filename: path.join(import.meta.dirname, 'fixtures/strict-mode/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});

describe('S6582 without strictNullChecks', () => {
  it('reports when strictNullChecks is disabled — null/undefined type reasoning is not meaningful', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures/no-strict-null-checks'),
      },
    });
    ruleTester.run('S6582', rule, {
      valid: [],
      invalid: [
        {
          // Without strictNullChecks, undefined is implicitly assignable to all types,
          // so suppressing based on contextual type is not meaningful
          code: `function getLen(arr: string[] | null): number | null { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/no-strict-null-checks/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});

describe('S6582', () => {
  it('does not raise without TypeScript services', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('S6582', rule, {
      valid: [{ code: `foo && foo.a;` }],
      invalid: [],
    });
  });

  it('suppresses reports when optional chaining would change type from T|null to T|undefined', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    ruleTester.run('S6582', rule, {
      valid: [
        {
          // FP: return type 'number | null' excludes undefined — replacing with optional chaining would change type
          code: `function getLen(arr: string[] | null): number | null { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: variable typed as 'number | null' excludes undefined
          code: `function f(a: number[] | null) { const x: number | null = a && a.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: variable typed as 'string | null' excludes undefined
          code: `interface Item { name: string; } function f(item: Item | null) { const x: string | null = item && item.name; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: method return type 'ISnapshot | null' excludes undefined — replacing with optional chaining gives 'ISnapshot | undefined', not assignable to 'ISnapshot | null'
          code: `interface ISnapshot { getText(): string; } interface Entry { snapshot: ISnapshot; } class Cache { getEntry(k: string): Entry | null { return null; } getSnapshot(k: string): ISnapshot | null { const e = this.getEntry(k); return e && e.snapshot; } }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: object literal field typed 'string | null' — replacing with optional chaining gives 'string | undefined', not assignable to 'string | null'
          code: `interface Entry { version: string; } class Cache { getEntry(k: string): Entry | null { return null; } getInfo(k: string): { version: string | null } { const e = this.getEntry(k); return { version: e && e.version }; } }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: angular.js line 768 pattern — a.prop || (a[0] && a[0].prop) inside a string-typed call
          // The && is inside an || whose contextual type is string (excludes undefined)
          code: `declare function lowercase(s: string): string; declare const el: { nodeName: string; 0?: { nodeName: string } }; function f() { return lowercase(el.nodeName || (el[0] && el[0].nodeName)); }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // FP: desktop/tutorial-assessor.ts pattern — a !== undefined && a.method() in boolean return
          // commit?.parentSHAs.some() returns boolean|undefined, not assignable to boolean return type
          code: `interface Commit { parentSHAs: string[] } function hasMultipleCommits(commit: Commit | undefined): boolean { return commit !== undefined && commit.parentSHAs.some(x => x.length > 0) }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [
        {
          // boolean context (if-condition): no contextual type — optional chaining is type-safe
          code: `function f(arr: string[] | null) { if (arr && arr.length) {} }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // negation pattern: ! always returns boolean, so !arr?.length is type-safe even in boolean return context
          code: `function f(arr: string[] | null): boolean { return !arr || !arr.length; }`,
          output: `function f(arr: string[] | null): boolean { return !arr?.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // return type includes undefined — optional chaining preserves assignability
          code: `function f(arr: string[] | null): number | undefined { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // comparison pattern: !a || a.prop !== b rewrites to a?.prop !== b, which is always boolean — no undefined leak
          code: `interface Opts { module: number; } function changesAffect(a: Opts | null, b: Opts): boolean { return !a || a.module !== b.module; }`,
          output: `interface Opts { module: number; } function changesAffect(a: Opts | null, b: Opts): boolean { return a?.module !== b.module; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // comparison pattern (&&): a && a.prop === b rewrites to a?.prop === b, which is always boolean — no undefined leak
          // inspired by tsc.js ruling patterns like `node.parent.parent && node.parent.parent.kind === 163`
          code: `interface Node { kind: number; } function f(node: Node | null): void { if (node && node.kind === 160) {} }`,
          output: `interface Node { kind: number; } function f(node: Node | null): void { if (node?.kind === 160) {} }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // loose inequality: a && a.p != null rewrites to a?.p != null, which is always boolean — no undefined leak
          code: `interface Item { p: string } function f(a: Item | null): boolean { return a && a.p != null; }`,
          output: `interface Item { p: string } function f(a: Item | null): boolean { return a?.p != null; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // left operand of ||: (repo && repo.name) || fallback — repo?.name || fallback is type-safe
          // because || absorbs the undefined introduced by optional chaining
          code: `interface Repo { name: string } declare function getBase(p: string): string; class Repository { name: string; constructor(path: string, repo: Repo | null) { this.name = (repo && repo.name) || getBase(path) } }`,
          output: `interface Repo { name: string } declare function getBase(p: string): string; class Repository { name: string; constructor(path: string, repo: Repo | null) { this.name = (repo?.name) || getBase(path) } }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // left operand of ??: (repo && repo.name) ?? fallback — repo?.name ?? fallback is type-safe
          // because ?? absorbs the undefined introduced by optional chaining
          code: `interface Repo { name: string } declare function getBase(p: string): string; function f(repo: Repo | null): string { return (repo && repo.name) ?? getBase('path'); }`,
          output: `interface Repo { name: string } declare function getBase(p: string): string; function f(repo: Repo | null): string { return (repo?.name) ?? getBase('path'); }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // void contextual type: undefined is assignable to void, so arr?.length is safe
          code: `function f(arr: string[] | null) { const fn: () => void = () => arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // return type any accepts undefined — optional chaining preserves assignability
          code: `function f(arr: string[] | null): any { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // return type unknown accepts undefined — optional chaining preserves assignability
          code: `function f(arr: string[] | null): unknown { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});
