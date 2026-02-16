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
import path from 'node:path';
import parser from '@typescript-eslint/parser';

const filename = path.join(import.meta.dirname, 'fixtures/placeholder.ts');

describe('S4325', () => {
  it('S4325', () => {
    const ruleTester = new RuleTester({
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });
    ruleTester.run('Redundant casts and non-null assertions should be avoided', rule, {
      valid: [
        {
          // Generic return type narrowed by type assertion
          filename,
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
function measureRange(vcr: ViewContainerRef) {
  const view = vcr.get(0) as EmbeddedViewRef<unknown> | null;
  return view?.rootNodes[0];
}
          `,
        },
        {
          // Generic validate() return narrowed to union type alias
          filename,
          code: `
interface StandardSchema {
  validate<T>(value: unknown): T;
}
type Result<T> = { value?: T } | Promise<{ value?: T }>;
function createValidator<S>(schema: StandardSchema, getValue: () => unknown) {
  return schema.validate(getValue()) as Result<S>;
}
          `,
        },
        {
          // Non-null assertion on nullable class property
          filename,
          code: `
interface Api { user(): Promise<{ name: string }>; }
class Client {
  api: Api | null = null;
  async getUser() {
    return await this.api!.user();
  }
}
          `,
        },
        {
          // Generic cache lookup narrowed to specific type
          filename,
          code: `
class QueryClient {
  private cache = new Map<string, unknown>();
  getQueryData<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }
}
function getUser(client: QueryClient) {
  return client.getQueryData('user') as { name: string } | undefined;
}
          `,
        },
        {
          // Cast to any
          filename,
          code: `
class Widget { name: string = 'widget'; }
function render(component: Widget) {
  return (component as any).internalProps;
}
          `,
        },
        {
          // Cast to unknown
          filename,
          code: `
function serialize(value: string): unknown {
  return value as unknown;
}
          `,
        },
        {
          // Non-null assertion on optional parameter
          filename,
          code: `
function greet(name?: string) {
  console.log('Hello, ' + name!);
}
          `,
        },
        {
          // Generic method with type parameter inference
          filename,
          code: `
class Container {
  private data = new Map<string, unknown>();
  get<T>(key: string): T {
    return this.data.get(key) as T;
  }
}
function getConfig(container: Container) {
  const port = container.get('port') as number;
  const host = container.get('host') as string;
  return { port, host };
}
          `,
        },
      ],
      invalid: [
        {
          // Truly unnecessary: typeof already narrowed to string
          filename,
          code: `
function getName(x?: string | number) {
  if (typeof x === 'string') {
    return (x as string);
  }
  return 'default';
}
          `,
          output: `
function getName(x?: string | number) {
  if (typeof x === 'string') {
    return (x);
  }
  return 'default';
}
          `,
          errors: 1,
        },
        {
          // Truly unnecessary: non-null assertion inside truthy check
          filename,
          code: `
function getName(x?: string | { name: string }) {
  if (x) {
    console.log("Getting name for " + x!);
  }
}
          `,
          output: `
function getName(x?: string | { name: string }) {
  if (x) {
    console.log("Getting name for " + x);
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
