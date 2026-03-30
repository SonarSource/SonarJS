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
        const services = context.sourceCode.parserServices as any;
        if (services?.esTreeNodeToTSNodeMap) {
          const origGet = services.esTreeNodeToTSNodeMap.get.bind(services.esTreeNodeToTSNodeMap);
          services.esTreeNodeToTSNodeMap.get = (node: any) => {
            if (node?.type === 'LogicalExpression') return undefined;
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
      ],
      invalid: [
        {
          // boolean context (if-condition): no contextual type — optional chaining is type-safe
          code: `function f(arr: string[] | null) { if (arr && arr.length) {} }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // return type includes undefined — optional chaining preserves assignability
          code: `function f(arr: string[] | null): number | undefined { return arr && arr.length; }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});
