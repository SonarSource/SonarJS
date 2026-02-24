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
import { RuleTester, NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import path from 'node:path';
import parser from '@typescript-eslint/parser';
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

  it('should not flag non-null assertions on declared nullable types with strictNullChecks', () => {
    const strictNullTester = new RuleTester({
      parser,
      parserOptions: {
        project: `./tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    strictNullTester.run('S4325 non-null assertions', rule, {
      valid: [
        {
          // Property declared as T | null
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
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // Variable declared as T | undefined
          code: `
            let config: { debug: boolean } | undefined;
            function getDebug() {
              return config!.debug;
            }
          `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [],
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

  it('should flag non-null assertions without strictNullChecks', () => {
    ruleTester.run('S4325 non-null without strictNullChecks', rule, {
      valid: [],
      invalid: [
        {
          // Without strictNullChecks, non-null assertions are no-ops and should be flagged
          code: `
            function getUser(): string { return ''; }
            getUser()!;
          `,
          output: `
            function getUser(): string { return ''; }
            getUser();
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should pass through report descriptor without a node property (line 49-50)', () => {
    // Create a mock rule that reports using a loc-only descriptor (no 'node' property).
    // The decorator should fall through and forward the report as-is.
    const mockInnerRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(context) {
        return {
          Identifier(node) {
            // Report using loc only - no 'node' property in descriptor
            context.report({
              message: 'test message',
              loc: { line: node.loc!.start.line, column: node.loc!.start.column },
            });
          },
        };
      },
    };
    const decoratedRule = decorate(mockInnerRule);
    const tester = new RuleTester();
    // The decorated rule should forward the loc-only report (no suppression)
    tester.run('S4325 no-node descriptor', decoratedRule, {
      valid: [],
      invalid: [
        {
          code: `const x = 1;`,
          errors: [{ message: 'test message' }],
        },
      ],
    });
  });

  it('should pass through report when parser services are not available (lines 55-56)', () => {
    // Create a mock rule that always reports a TSAsExpression node.
    // When used without type-checking parser services, the decorator should
    // fall through and forward the report unchanged.
    const mockInnerRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(context) {
        return {
          TSAsExpression(node) {
            context.report({ node, message: 'mock report' });
          },
        };
      },
    };
    const decoratedRule = decorate(mockInnerRule);
    const noTypeTester = new NoTypeCheckingRuleTester();
    // Without type info, isRequiredParserServices returns false → report is forwarded
    noTypeTester.run('S4325 no parser services', decoratedRule, {
      valid: [],
      invalid: [
        {
          code: `const x = value as string;`,
          errors: [{ message: 'mock report' }],
        },
      ],
    });
  });

  it('should suppress non-null assertion that is contextually unnecessary but type is still nullable (line 69)', () => {
    // When a variable of type T|null is assigned to another T|null variable,
    // the upstream rule reports the ! as contextually unnecessary.
    // But the decorator suppresses it because the expression type is still a nullable union.
    const strictNullTester = new RuleTester({
      parser,
      parserOptions: {
        project: `./tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    strictNullTester.run('S4325 non-null contextually unnecessary but nullable', rule, {
      valid: [
        {
          // x: string | null assigned to y: string | null — upstream would flag x! as
          // contextually unnecessary (both sides accept null), but decorator suppresses
          // because the expression type is still a nullable union (line 69 executed).
          code: `
            let x: string | null = null;
            let y: string | null = x!;
          `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [],
    });
  });

  it('should suppress assertion to any when expression type differs from any (line 100)', () => {
    // Create a mock inner rule that always reports TSAsExpression nodes.
    // When the assertion target is `any` and the expression type is not `any`,
    // shouldSuppressTypeAssertion returns true (line 100), suppressing the report.
    const mockInnerRule: Rule.RuleModule = {
      meta: { type: 'suggestion', fixable: 'code', messages: {} },
      create(context) {
        return {
          TSAsExpression(node) {
            context.report({ node, message: 'mock report' });
          },
        };
      },
    };
    const decoratedRule = decorate(mockInnerRule);
    // The decorated rule suppresses: number as any (expression is number, target is any)
    ruleTester.run('S4325 any cast suppressed via line 100', decoratedRule, {
      valid: [
        {
          // number as any: assertionTargetType.flags === Any, expressionType.flags === Number
          // flags differ → return true at line 100 → report suppressed
          code: `
            const n: number = 42;
            const x = n as any;
          `,
        },
        {
          // string as unknown: assertionTargetType.flags === Unknown, expressionType.flags === String
          // flags differ → return true at line 100 → report suppressed
          code: `
            const s: string = 'hello';
            const x = s as unknown;
          `,
        },
      ],
      invalid: [],
    });
  });
});
