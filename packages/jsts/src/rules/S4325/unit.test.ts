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
import { rule } from './index.js';
import { decorate } from './decorator.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import assert from 'node:assert';
import type { Rule } from 'eslint';

const ruleTester = new RuleTester();

describe('S4325', () => {
  it('should not flag assertions narrowing generic function return types', () => {
    ruleTester.run('S4325 generic return types', rule, {
      valid: [
        {
          // Generic method with type parameter inferred from assertion target
          code: `
            interface ViewRef { destroy(): void; }
            interface EmbeddedViewRef<C> extends ViewRef {
              rootNodes: HTMLElement[];
              context: C;
            }
            class ViewContainerRef {
              private views: ViewRef[] = [];
              get<T extends ViewRef>(index: number): T | null {
                return (this.views[index] as T) ?? null;
              }
            }
            function measureRange(vcr: ViewContainerRef, start: number, end: number) {
              for (let i = 0; i < end - start; i++) {
                const view = vcr.get(i + start) as EmbeddedViewRef<unknown> | null;
                if (view && view.rootNodes.length) {
                  return view.rootNodes[0];
                }
              }
            }
          `,
        },
        {
          // Generic validate() narrowed to union type alias
          code: `
            interface StandardResult<Output> {
              value?: Output;
              issues?: { message: string }[];
            }
            interface StandardSchema {
              validate<T>(value: unknown): T;
            }
            type ValidationResult<S> = StandardResult<S> | Promise<StandardResult<S>>;
            function createValidator<S>(schema: StandardSchema, getValue: () => unknown) {
              return schema.validate(getValue()) as ValidationResult<S>;
            }
          `,
        },
        {
          // Generic cache lookup narrowed to specific type
          code: `
            class QueryClient {
              private cache = new Map<string, unknown>();
              getQueryData<T>(key: string): T | undefined {
                return this.cache.get(key) as T | undefined;
              }
            }
            function getUser(client: QueryClient) {
              const user = client.getQueryData('user') as { name: string } | undefined;
              return user;
            }
          `,
        },
        {
          // Generic service registry lookup
          code: `
            const registry = new Map<string, unknown>();
            function getService<T>(name: string): T {
              return registry.get(name) as T;
            }
            const logger = getService('logger') as { log(msg: string): void };
          `,
        },
        {
          // Generic querySelector narrowing to HTMLElement
          code: `
            class Component {
              private eGui: HTMLElement = document.createElement('div');
              queryForHtmlElement(cssSelector: string): HTMLElement {
                return this.eGui.querySelector(cssSelector) as HTMLElement;
              }
              queryForHtmlInputElement(cssSelector: string): HTMLInputElement {
                return this.eGui.querySelector(cssSelector) as HTMLInputElement;
              }
            }
          `,
        },
        {
          // Generic function with type parameter in declaration
          code: `
            function parseTokenNode<T extends object>(): T {
              return {} as T;
            }
            type EndOfFileToken = { kind: 'eof' };
            const token = parseTokenNode() as EndOfFileToken;
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not flag type assertions to any or unknown', () => {
    ruleTester.run('S4325 any/unknown casts', rule, {
      valid: [
        {
          code: `
            const value: number = 42;
            const asAny = value as any;
          `,
        },
        {
          code: `
            const value: number = 42;
            const asUnknown = value as unknown;
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should flag non-null assertions on declared nullable types without strictNullChecks', () => {
    ruleTester.run('S4325 non-null assertions without strictNullChecks', rule, {
      valid: [],
      invalid: [
        {
          // Property declared as T | null — flagged because without strictNullChecks, ! is a no-op
          code: `
            interface Api {
              user(): Promise<{ name: string }>;
            }
            class CmsClient {
              api: Api | null = null;
              async getUser() {
                return await this.api!.user();
              }
            }
          `,
          output: `
            interface Api {
              user(): Promise<{ name: string }>;
            }
            class CmsClient {
              api: Api | null = null;
              async getUser() {
                return await this.api.user();
              }
            }
          `,
          errors: 1,
        },
        {
          // Variable declared as T | undefined — flagged because without strictNullChecks, ! is a no-op
          code: `
            let config: { debug: boolean } | undefined;
            function getDebug() {
              return config!.debug;
            }
          `,
          output: `
            let config: { debug: boolean } | undefined;
            function getDebug() {
              return config.debug;
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should still flag truly unnecessary type assertions', () => {
    ruleTester.run('S4325 unnecessary assertions', rule, {
      valid: [],
      invalid: [
        {
          // Type already narrowed by typeof guard
          code: `
            function getName(x?: string | number) {
              if (typeof x === 'string') {
                return x as string;
              }
            }
          `,
          output: `
            function getName(x?: string | number) {
              if (typeof x === 'string') {
                return x;
              }
            }
          `,
          errors: 1,
        },
        {
          // Non-null assertion on a non-nullable parameter
          code: `
            function greet(name: string) {
              console.log(name!);
            }
          `,
          output: `
            function greet(name: string) {
              console.log(name);
            }
          `,
          errors: 1,
        },
        {
          // Casting any to any is truly redundant
          code: `
            function process(chunk: any) {
              let mutator = chunk as any;
            }
          `,
          output: `
            function process(chunk: any) {
              let mutator = chunk;
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should suppress non-null assertion on nullable union with strictNullChecks', () => {
    const strictNullTester = new RuleTester({
      parser,
      parserOptions: {
        project: `./tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    strictNullTester.run(
      'S4325 suppress contextually unnecessary non-null on nullable union',
      rule,
      {
        valid: [
          {
            // Non-null assertion on a parameter typed as a nullable union is suppressed when
            // the contextual type (return type) also accepts null.
            // Exercises shouldSuppressNonNullAssertion returning true (line 69 return).
            code: `
            function passNullable(x: string | null): string | null {
              return x!;
            }
          `,
            filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          },
          {
            // Non-null assertion on a nullable union with undefined is also suppressed.
            code: `
            function passUndefinable(x: number | undefined): number | undefined {
              return x!;
            }
          `,
            filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          },
        ],
        invalid: [],
      },
    );
  });

  it('should flag non-null assertions after null guard with strictNullChecks', () => {
    const strictNullTester = new RuleTester({
      parser,
      parserOptions: {
        project: `./tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    strictNullTester.run('S4325 non-null after guard with strictNullChecks', rule, {
      valid: [],
      invalid: [
        {
          // Non-null assertion after null guard is unnecessary with strictNullChecks
          code: `
            function convert(str: string | number | null | undefined) {
              if (str == null || str === '') {
                return undefined;
              }
              return isNaN(+str!);
            }
          `,
          output: `
            function convert(str: string | number | null | undefined) {
              if (str == null || str === '') {
                return undefined;
              }
              return isNaN(+str);
            }
          `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
        {
          // Non-null assertion on a call returning a non-nullable non-union type with strictNullChecks
          // Exercises shouldSuppressNonNullAssertion when resolvedType is not a union
          code: `
            function getId(): number { return 42; }
            const id = getId()!;
          `,
          output: `
            function getId(): number { return 42; }
            const id = getId();
          `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });

  it('should flag non-generic function call assertions', () => {
    ruleTester.run('S4325 non-generic call assertion', rule, {
      valid: [],
      invalid: [
        {
          // Non-generic function call with assertion to the same return type should still be flagged
          // Exercises isCalleeGeneric returning false for a non-generic function
          code: `
            function parse(): string { return ''; }
            const result = parse() as string;
          `,
          output: `
            function parse(): string { return ''; }
            const result = parse();
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should pass through report descriptor without a node', () => {
    // Exercises the defensive check at lines 49-50: when the upstream rule reports
    // a descriptor that has no 'node' property, the decorator forwards it as-is.
    const mockUpstream: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(ctx) {
        return {
          Program() {
            // Report without a node property (using loc instead) — tests the !('node' in reportDescriptor) branch
            (ctx as any).report({
              loc: { line: 1, column: 0 },
              message: 'upstream message without node',
            });
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
    assert.strictEqual(messages[0].message, 'upstream message without node');
  });

  it('should pass through report when TypeScript parser services are unavailable', () => {
    // Exercises lines 55-56: when the report descriptor has a node but the parser services
    // lack a TypeScript program (isRequiredParserServices returns false), the decorator
    // forwards the report without attempting type-based suppression.
    const mockUpstream: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(ctx) {
        return {
          Identifier(node) {
            ctx.report({ node, message: 'upstream message with node' });
          },
        };
      },
    };
    const decorated = decorate(mockUpstream);
    // Run with the default ESLint parser (no TypeScript parser services)
    const linter = new Linter();
    const messages = linter.verify('const x = 1;', {
      plugins: { test: { rules: { r: decorated } } },
      rules: { 'test/r': 'error' },
    });
    // 'x' and '1' are identifiers, so two reports are forwarded
    assert.ok(messages.length >= 1);
    assert.strictEqual(messages[0].message, 'upstream message with node');
  });
});
