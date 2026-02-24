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

describe('S4325', () => {
  it('S4325', () => {
    const ruleTester = new RuleTester();

    ruleTester.run('Unnecessary type assertions should be removed', rule, {
      valid: [
        // Compliant: generic function return type (T inferred from assertion target)
        {
          code: `
interface ViewRef { destroy(): void; }
interface EmbeddedViewRef<C> extends ViewRef { rootNodes: HTMLElement[]; }
class ViewContainerRef {
  private views: ViewRef[] = [];
  get<T extends ViewRef>(index: number): T | null { return (this.views[index] as T) ?? null; }
}
function measure(viewContainerRef: ViewContainerRef) {
  const view = viewContainerRef.get(0) as EmbeddedViewRef<unknown> | null;
  return view?.rootNodes[0];
}
          `,
        },
        // Compliant: generic method return type with union alias
        {
          code: `
interface StandardResult<Output> { value?: Output; }
interface StandardSchema { validate<T>(value: unknown): T; }
type Result<T> = StandardResult<T> | Promise<StandardResult<T>>;
function createValidator<TSchema>(schema: StandardSchema, getValue: () => unknown) {
  return schema.validate(getValue()) as Result<TSchema>;
}
          `,
        },
        // Compliant: generic store lookup (T inferred from assertion target)
        {
          code: `
class QueryClient {
  private cache = new Map<string, unknown>();
  getQueryData<T>(key: string): T | undefined { return this.cache.get(key) as T | undefined; }
}
interface UserProfile { name: string; }
function getUser(client: QueryClient) {
  return client.getQueryData('user') as UserProfile | undefined;
}
          `,
        },
        // Compliant: non-null assertion on a property declared as `Api | null`
        {
          code: `
interface Api { fetch(): Promise<string>; }
class Client {
  api: Api | null = null;
  async getData() { return await this.api!.fetch(); }
}
          `,
        },
        // Compliant: non-null assertion on parameter declared as `string | undefined`
        {
          code: `
function process(value: string | undefined) { return value!.toUpperCase(); }
          `,
        },
        // Compliant: non-null assertion on interface property declared as nullable
        {
          code: `
interface Config { timeout: number | null; }
function getTimeout(config: Config): number { return config.timeout!; }
          `,
        },
        // Compliant: assertion to `any` changes type behavior
        {
          code: `const x: string = 'hello'; const y = x as any;`,
        },
        // Compliant: assertion to `unknown` changes type behavior
        {
          code: `const x: string = 'hello'; const y = x as unknown;`,
        },
        // Compliant: assertion narrows a non-generic union return type
        {
          code: `
function getStringOrNumber(): string | number { return 42; }
const s = getStringOrNumber() as string;
          `,
        },
      ],
      invalid: [
        // Noncompliant: TypeScript already knows x is a string after typeof narrowing
        {
          code: `
function getName(x?: string | object) {
  if (typeof x === 'string') { return (x as string); }
  return '';
}
          `,
          errors: 1,
        },
        // Noncompliant: TypeScript knows x is defined inside the truthy check
        {
          code: `
function getName(x?: string) {
  if (x) { return x!; }
  return '';
}
          `,
          errors: 1,
        },
        // Noncompliant: assertion to the same type TypeScript already infers
        {
          code: `const x: string = 'hello'; const y = x as string;`,
          errors: 1,
        },
      ],
    });
  });
});
