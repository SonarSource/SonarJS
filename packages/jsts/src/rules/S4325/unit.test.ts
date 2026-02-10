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
          // FP: Type assertion narrowing a generic function return type.
          // The function get<T>() returns T, and TypeScript infers the generic
          // parameter from the assertion target, making the upstream rule think
          // both types are identical (reference equality).
          code: `
interface ViewRef {
  destroy(): void;
}

interface EmbeddedViewRef<C> extends ViewRef {
  rootNodes: HTMLElement[];
  context: C;
}

declare class ViewContainerRef {
  get<T extends ViewRef>(index: number): T | null;
  readonly length: number;
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
          // FP: Type assertion narrowing a generic method's return type
          // to a union type alias. The validate() method returns a generic type T,
          // and TypeScript infers the generic parameter from the assertion target.
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
          // FP: Non-null assertion on a property declared as nullable.
          // The property 'api' is declared as Api | null, and the non-null
          // assertion is necessary because TypeScript's control flow analysis
          // cannot guarantee the property is non-null at the usage site.
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
          // FP: Type assertion on a generic cache/store lookup return type.
          // The method getQueryData<T>() returns T, and TypeScript infers
          // the generic parameter from the assertion target.
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

declare class QueryClient {
  getQueryData<T>(key: string): T | undefined;
  setQueryData<T>(key: string, data: T): void;
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
          // FP: Cast to 'any' always changes type behavior and should not be flagged.
          code: `
class GameWidget {}
const widget = new GameWidget();
const anyWidget = widget as any;
          `,
        },
        {
          // FP: Cast to 'unknown' always changes type behavior and should not be flagged.
          code: `
const value: string = 'hello';
const unknownValue = value as unknown;
          `,
        },
        {
          // FP: Generic function returning T, cast to a specific interface.
          // TypeScript infers T from the cast target, making both types
          // appear reference-equal to the upstream rule.
          code: `
interface Config {
  host: string;
  port: number;
}

function getConfig<T>(key: string): T {
  return JSON.parse('{}');
}

const config = getConfig('db') as Config;
console.log(config.host);
          `,
        },
        {
          // FP: Generic method on a Map-like structure, narrowing the return type.
          code: `
declare class Registry {
  get<T>(key: string): T;
}

interface Logger {
  log(msg: string): void;
}

function getLogger(registry: Registry) {
  const logger = registry.get('logger') as Logger;
  logger.log('hello');
}
          `,
        },
        {
          // FP: Non-null assertion on an optional parameter that has been
          // assigned but flow analysis can't track across method boundaries.
          code: `
class EventEmitter {
  private handler: ((event: string) => void) | undefined;

  on(handler: (event: string) => void) {
    this.handler = handler;
  }

  emit(event: string) {
    this.handler!(event);
  }
}
          `,
        },
        {
          // Genuine valid assertion: widening a type via double assertion.
          code: `
const x: number = 42;
const y = (x as unknown) as string;
          `,
        },
      ],
      invalid: [
        {
          // Truly unnecessary: variable already narrowed by typeof check
          code: `
function getName(x?: string | Person) {
  if (x) {
    if (typeof x === 'string') {
      return (x as string);
    }
  }
  return 'NoName';
}
interface Person { name: string; }
          `,
          output: `
function getName(x?: string | Person) {
  if (x) {
    if (typeof x === 'string') {
      return (x);
    }
  }
  return 'NoName';
}
interface Person { name: string; }
          `,
          errors: 1,
        },
        {
          // Truly unnecessary: non-null assertion inside truthy guard
          code: `
function greet(name?: string) {
  if (name) {
    console.log(name!);
  }
}
          `,
          output: `
function greet(name?: string) {
  if (name) {
    console.log(name);
  }
}
          `,
          errors: 1,
        },
        {
          // Truly unnecessary: casting to the same type
          code: `
const x: number = 42;
const y = x as number;
          `,
          output: `
const x: number = 42;
const y = x;
          `,
          errors: 1,
        },
      ],
    });
  });
});
