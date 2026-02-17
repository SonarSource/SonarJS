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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const RULE_NAME = 'Redundant casts and non-null assertions should be avoided';

describe('S4325', () => {
  it('should not flag assertions narrowing generic function return types', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // Generic method return narrowed to specific subtype
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
              const view = vcr.get(start) as EmbeddedViewRef<unknown> | null;
              return view?.rootNodes[0];
            }
          `,
        },
        {
          // Generic method return narrowed to union type alias
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
          // Generic cache lookup narrowed to concrete type
          code: `
            interface QueryData { fetchedAt: number; }
            interface UserProfile extends QueryData { name: string; }
            class QueryClient {
              private cache = new Map<string, unknown>();
              getQueryData<T>(key: string): T | undefined {
                return this.cache.get(key) as T | undefined;
              }
            }
            function getUser(client: QueryClient) {
              return client.getQueryData('user') as UserProfile | undefined;
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not flag assertions narrowing generic DOM queries', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // querySelector is generic — assertion narrows Element to HTMLElement
          code: `
            class Component {
              private eGui: HTMLElement = document.createElement('div');
              getElement(selector: string) {
                return this.eGui.querySelector(selector) as HTMLElement;
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not flag assertions on calls returning any', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // Function declared to return `any` — assertion narrows to a specific type
          code: `
            declare function loadNativeComponent(name: string): any;
            interface View { style: object; }
            const NativeView = loadNativeComponent("NativeView") as typeof View;
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not flag non-null assertions on nullable declared types', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
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
        },
        {
          // Property declared as T | undefined
          code: `
            interface Config { port: number; }
            class App {
              config: Config | undefined;
              getPort() {
                return this.config!.port;
              }
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not flag non-null assertions on nullable variables in closures', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // Variable declared as T | undefined, assigned in outer scope, used with ! in callback
          code: `
            function withClient<T>(fn: (c: string) => T): () => Promise<T> {
              return async (): Promise<T> => {
                let result: T | undefined;
                try { result = fn("client"); } finally { /* cleanup */ }
                return result!;
              };
            }
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should not flag assertions narrowing any-typed expressions to specific types', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          // Expression typed as any (e.g. unresolved module), assertion narrows to specific type
          code: `
            declare function resolveDynamicComponent(name: string): any;
            type RouterLink = { to: string };
            const result = resolveDynamicComponent('RouterLink') as RouterLink | string;
          `,
        },
      ],
      invalid: [],
    });
  });

  it('should still flag genuinely unnecessary type assertions', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          // typeof already narrowed to string
          code: `
            function process(x: string | number) {
              if (typeof x === 'string') {
                return (x as string).toUpperCase();
              }
            }
          `,
          output: `
            function process(x: string | number) {
              if (typeof x === 'string') {
                return (x).toUpperCase();
              }
            }
          `,
          errors: 1,
        },
        {
          // Variable already has the asserted type
          code: `
            const x: string = 'hello';
            const y = x as string;
          `,
          output: `
            const x: string = 'hello';
            const y = x;
          `,
          errors: 1,
        },
        {
          // Casting `any` to `any` is genuinely unnecessary
          code: `
            function handle(chunk: any) {
              let data = chunk as any;
            }
          `,
          output: `
            function handle(chunk: any) {
              let data = chunk;
            }
          `,
          errors: 1,
        },
        {
          // Casting call returning any to any — genuinely unnecessary
          code: `
            declare function getGlobal(): any;
            const g = getGlobal() as any;
          `,
          output: `
            declare function getGlobal(): any;
            const g = getGlobal();
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should still flag genuinely unnecessary non-null assertions', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          // Value known non-null from truthiness check
          code: `
            function getName(x?: string) {
              if (x) {
                return x!;
              }
            }
          `,
          output: `
            function getName(x?: string) {
              if (x) {
                return x;
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should flag non-null assertions after early-return narrowing guards', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          // Early return: if (!x) return → x is narrowed after
          code: `
            function process(x?: string) {
              if (!x) return;
              console.log(x!);
            }
          `,
          output: `
            function process(x?: string) {
              if (!x) return;
              console.log(x);
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should flag non-null assertions in else branches after null checks', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [],
      invalid: [
        {
          // Else branch after null check: if (x == null) → else x is non-null
          code: `
            function convert(str: string | null | undefined) {
              if (str == null) {
                return undefined;
              } else {
                return str!.toUpperCase();
              }
            }
          `,
          output: `
            function convert(str: string | null | undefined) {
              if (str == null) {
                return undefined;
              } else {
                return str.toUpperCase();
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
