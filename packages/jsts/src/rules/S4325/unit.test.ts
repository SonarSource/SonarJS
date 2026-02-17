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

  it('should not flag assertions to any or unknown', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(RULE_NAME, rule, {
      valid: [
        {
          code: `
            const value: string = 'hello';
            const result = (value as any).nonExistentMethod();
          `,
        },
        {
          code: `
            const value: string = 'hello';
            const result = value as unknown;
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
});
