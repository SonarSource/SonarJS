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
    ruleTester.run('Redundant casts and non-null assertions should be avoided', rule, {
      valid: [
        {
          // Generic return type narrowed by type assertion
          code: `
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
}

function measureRange(viewContainerRef: ViewContainerRef, start: number, end: number) {
  for (let i = 0; i < end - start; i++) {
    const view = viewContainerRef.get(i + start) as EmbeddedViewRef<unknown> | null;
    if (view && view.rootNodes.length) {
      return view.rootNodes[0];
    }
  }
}
          `,
        },
        {
          // Generic validate() method return narrowed to union type alias
          code: `
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
          // Non-null assertion on property declared as nullable
          code: `
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
          // Generic cache lookup return type narrowed
          code: `
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
}

function displayUserComments(client: QueryClient) {
  const user = client.getQueryData('user') as UserProfile | undefined;
  const comments = client.getQueryData('comments') as PaginatedList<string> | undefined;

  if (user && comments) {
    console.log(user.name + ' has ' + comments.total + ' comments');
  }
}
          `,
        },
        {
          // Cast to any on a typed expression
          code: `
class Widget {
  name: string = 'widget';
}
function render(component: Widget, target: HTMLElement) {
  const props = (component as any).internalProps;
  return props;
}
          `,
        },
        {
          // Cast to unknown
          code: `
function serialize(value: string): unknown {
  return value as unknown;
}
          `,
        },
        {
          // Non-null assertion on optional parameter
          code: `
function greet(name?: string) {
  console.log('Hello, ' + name!);
}
          `,
        },
        {
          // Generic method with different type parameter inference
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
          // Truly unnecessary: variable is already narrowed by typeof
          code: `
function getName(x?: string | number) {
  if (typeof x === 'string') {
    return (x as string);
  }
  return 'default';
}
          `,
          errors: 1,
        },
        {
          // Truly unnecessary: non-null assertion inside truthy check
          code: `
function getName(x?: string | { name: string }) {
  if (x) {
    console.log("Getting name for " + x!);
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
