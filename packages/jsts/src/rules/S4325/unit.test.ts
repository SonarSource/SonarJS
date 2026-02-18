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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

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

  it('should not flag non-null assertions on declared nullable types', () => {
    ruleTester.run('S4325 non-null assertions', rule, {
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
          // Variable declared as T | undefined
          code: `
            let config: { debug: boolean } | undefined;
            function getDebug() {
              return config!.debug;
            }
          `,
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
});
