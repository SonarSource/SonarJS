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

    ruleTester.run('Type assertions should not be redundant', rule, {
      valid: [
        {
          code: `
// Generic function return type - assertion narrows T to specific type
interface ViewRef {
  destroy(): void;
}

interface EmbeddedViewRef<C> extends ViewRef {
  rootNodes: HTMLElement[];
  context: C;
}

class ViewContainerRef {
  private views: ViewRef[] = [];

  get<T extends ViewRef>(index: number): T | null {
    return (this.views[index] as T) ?? null;
  }

  get length(): number {
    return this.views.length;
  }
}

function measureRange(viewContainerRef: ViewContainerRef, start: number, end: number) {
  let firstNode: HTMLElement | undefined;

  for (let i = 0; i < end - start; i++) {
    const view = viewContainerRef.get(i + start) as EmbeddedViewRef<unknown> | null;
    if (view && view.rootNodes.length) {
      firstNode = view.rootNodes[0];
      break;
    }
  }

  return firstNode;
}
          `,
        },
        {
          code: `
// Generic method return type narrowed to union type alias
interface StandardResult<Output> {
  value?: Output;
  issues?: { message: string }[];
}

interface StandardSchema {
  validate<T>(value: unknown): T;
}

type ValidationResult<TSchema> =
  | StandardResult<TSchema>
  | Promise<StandardResult<TSchema>>;

function createValidator<TSchema>(
  schema: StandardSchema,
  getValue: () => unknown,
) {
  return schema.validate(getValue()) as ValidationResult<TSchema>;
}
          `,
        },
        {
          code: `
// Non-null assertion on property declared as nullable
interface Api {
  user(): Promise<{ name: string }>;
  hasWriteAccess(): Promise<boolean>;
}

class CmsClient {
  api: Api | null = null;

  async authenticate(token: string) {
    if (token) {
      this.api = this.createApi(token);
    }
  }

  async getUser() {
    const user = await this.api!.user();
    const isCollab = await this.api!.hasWriteAccess();
    return { user, isCollab };
  }

  logout() {
    this.api = null;
  }

  private createApi(_token: string): Api {
    return {
      user: async () => ({ name: 'test' }),
      hasWriteAccess: async () => true,
    };
  }
}
          `,
        },
        {
          code: `
// Generic cache lookup return type
interface QueryData {
  fetchedAt: number;
}

interface UserProfile extends QueryData {
  name: string;
  email: string;
}

interface PaginatedList<T> extends QueryData {
  items: T[];
  total: number;
  page: number;
}

class QueryClient {
  private cache = new Map<string, unknown>();

  getQueryData<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  setQueryData<T>(key: string, data: T): void {
    this.cache.set(key, data);
  }
}

function displayUserComments(client: QueryClient) {
  const user = client.getQueryData('user') as UserProfile | undefined;
  const comments = client.getQueryData('comments') as PaginatedList<string> | undefined;

  if (user && comments) {
    console.log(\`\${user.name} has \${comments.total} comments on page \${comments.page}\`);
  }
}
          `,
        },
        {
          code: `
// Assertion to any type from non-any source
function processData(data: unknown) {
  const obj = data as any;
  return obj.property;
}
          `,
        },
        {
          code: `
// Assertion to unknown type from non-unknown source
function wrapValue(value: string) {
  return value as unknown;
}
          `,
        },
        {
          code: `
// Generic querySelector return type narrowed to specific element
function getElement(root: HTMLElement) {
  const input = root.querySelector('input') as HTMLInputElement;
  const header = root.querySelector('#header') as HTMLElement;
  return { input, header };
}
          `,
        },
        {
          code: `
// Assertion to any on typed source (props spreading pattern)
interface CustomProps { width: number; height: number; }
function render(props: CustomProps) {
  return { ...(props as any) };
}
          `,
        },
        {
          code: `
// Generic lodash-like filter return type
declare function filter<T>(collection: T[], predicate: (item: T) => boolean): T[];
interface Column { name: string; getSort(): string | null; }
function getSortedColumns(columns: Column[]) {
  return filter(columns, (c: Column) => !!c.getSort()) as Column[];
}
          `,
        },
        {
          code: `
// Variable with nullable declared type
let value: string | null = null;

function useValue() {
  if (Math.random() > 0.5) {
    value = "test";
  }
  console.log(value!.length);
}
          `,
        },
        {
          code: `
// Parameter with nullable declared type
function process(item: { data: string } | undefined) {
  return item!.data;
}
          `,
        },
      ],
      invalid: [
        {
          code: `
function getName(x?: string | { name: string }) {
  if (x) {
    console.log("Getting name for " + x!);

    if (typeof x === "string") {
      return (x as string);
    } else {
      return (x as { name: string }).name;
    }
  }
  return "NoName";
}
          `,
          output: `
function getName(x?: string | { name: string }) {
  if (x) {
    console.log("Getting name for " + x);

    if (typeof x === "string") {
      return (x);
    } else {
      return (x as { name: string }).name;
    }
  }
  return "NoName";
}
          `,
          errors: 2,
        },
        {
          code: `
// Non-generic function call - assertion is redundant
function getString(): string {
  return "test";
}

const result = getString() as string;
          `,
          output: `
// Non-generic function call - assertion is redundant
function getString(): string {
  return "test";
}

const result = getString();
          `,
          errors: 1,
        },
        {
          code: `
// Already narrowed by typeof
function test(x: string | number) {
  if (typeof x === "string") {
    const s = x as string;
    console.log(s);
  }
}
          `,
          output: `
// Already narrowed by typeof
function test(x: string | number) {
  if (typeof x === "string") {
    const s = x;
    console.log(s);
  }
}
          `,
          errors: 1,
        },
        {
          code: `
// any-to-any assertion is genuinely redundant
function isPromise(value: any): boolean {
  return value && typeof (value as any).then === 'function';
}
          `,
          output: `
// any-to-any assertion is genuinely redundant
function isPromise(value: any): boolean {
  return value && typeof (value).then === 'function';
}
          `,
          errors: 1,
        },
        {
          code: `
// Non-null assertion after truthiness narrowing is redundant
function test(x?: string) {
  if (x) {
    return x!.length;
  }
  return 0;
}
          `,
          output: `
// Non-null assertion after truthiness narrowing is redundant
function test(x?: string) {
  if (x) {
    return x.length;
  }
  return 0;
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
