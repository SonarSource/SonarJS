/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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
import { RuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

import path from 'node:path';
import parser from '@typescript-eslint/parser';

describe('S7503', () => {
  const ruleTester = new RuleTester({
    parser,
    parserOptions: {
      project: `./tsconfig.json`,
      tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
    },
  });
  const filename = path.join(import.meta.dirname, 'fixtures/index.ts');

  it('S7503', () => {
    ruleTester.run('S7503', rule, {
      valid: [
        {
          code: `
async function foo() {
  await bar();
}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
async function empty() {}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
async function* generator() {
  yield Promise.resolve(1);
}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
async function withAwaitUsing() {
  await using resource = getDisposable();
}
declare function getDisposable(): AsyncDisposable;
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
type Value = { id: number };
function withCallback(callback: () => Promise<Value | null> = async () => null) {}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
type Callback = () => PromiseLike<string>;
function withCallback(callback: Callback = async function () { return 'value'; }) {}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
class MyClass {
  constructor(private readonly callback: (() => Promise<void>) | undefined = async () => {}) {}
  method(callback: (value: number) => Promise<number> = async value => value) {}
}
`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [
        {
          code: `
async function foo() {
  bar();
}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
class Service {
  @decorator()
  async handle() {
    return computeSync();
  }
}
declare function decorator(): MethodDecorator;
declare function computeSync(): number;
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
function withCallback(callback = async () => null) {}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
function withCallback(callback: () => number | Promise<number> = async () => 1) {}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          code: `
function withCallback(callback: Function = async () => null) {}
`,
          errors: 1,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
    });
  });

  it('should not report Server Functions', () => {
    ruleTester.run('S7503 - use server', rule, {
      valid: [
        {
          // https://nextjs.org/docs/messages/invalid-use-server-value
          code: `
'use server';
export async function action(): Promise<{ status: string }> {
  return { status: 'ok' };
}
export default async function defaultAction() {
  return 1;
}
export const arrowAction = async () => 1;
async function listedAction() {
  return 1;
}
const expressionAction = async function () {
  return 1;
};
export { listedAction as aliasedAction, expressionAction };
`,
          filename,
        },
        {
          code: `
'use strict';
'use server';
export default async () => 1;
`,
          filename,
        },
        {
          code: `
function component() {
  async function inlineAction() {
    'use server';
    return 1;
  }
  return inlineAction;
}
`,
          filename,
        },
      ],
      invalid: [
        {
          code: `
'use server';
async function helper() { // Noncompliant: not exported
  return 1;
}
export async function action() {
  return helper();
}
`,
          errors: 1,
          filename,
        },
        {
          code: `
'use client';
export async function action() {
  return 1;
}
`,
          errors: 1,
          filename,
        },
        {
          // not a directive
          code: `
const value = 1;
'use server';
export async function action() {
  return value;
}
`,
          errors: 1,
          filename,
        },
        {
          // not a directive
          code: `
// 'use server';
export async function action() {
  return 1;
}
`,
          errors: 1,
          filename,
        },
        {
          // not a directive
          code: `
async function action() {
  doSomething();
  'use server';
}
declare function doSomething(): void;
`,
          errors: 1,
          filename,
        },
      ],
    });
  });

  it('should not report functions that must satisfy a Promise-returning contract', () => {
    ruleTester.run('S7503 - Promise-returning contracts', rule, {
      valid: [
        {
          code: `
type AsyncFunc = () => Promise<void>;
declare function doSomething(): void;
const annotated: AsyncFunc = async () => { doSomething(); };
const satisfying = (async () => { doSomething(); }) satisfies AsyncFunc;
const asserted = (async () => { doSomething(); }) as AsyncFunc;
const expression: AsyncFunc = async function () { doSomething(); };
const elements: AsyncFunc[] = [async () => { doSomething(); }];
const handlers: { onSave: AsyncFunc } = { onSave: async () => { doSomething(); } };
class Store {
  onSave: AsyncFunc = async () => { doSomething(); };
}
function make(): AsyncFunc {
  return async () => { doSomething(); };
}
`,
          filename,
        },
        {
          code: `
declare function withCallback(callback: () => Promise<void>): void;
declare function doSomething(): void;
withCallback(async () => {
  doSomething();
});
`,
          filename,
        },
        {
          code: `
interface Entity { id: number }
interface Repository {
  save(entity: Entity): Promise<void>;
}
class InMemoryRepository implements Repository {
  private readonly entities: Entity[] = [];
  async save(entity: Entity): Promise<void> {
    this.entities.push(entity);
  }
}
`,
          filename,
        },
        {
          code: `
abstract class Handler {
  abstract handle(): Promise<number>;
}
class SyncHandler extends Handler {
  async handle() {
    return 1;
  }
}
`,
          filename,
        },
        {
          // explicit annotations are contracts even under generic calls
          code: `
type AsyncFunc = () => Promise<void>;
declare function useMemo<T>(factory: () => T, deps: unknown[]): T;
declare function doSomething(): void;
const returned = useMemo((): AsyncFunc => async () => {
  doSomething();
}, []);
const asserted = useMemo(() => (async () => {
  doSomething();
}) satisfies AsyncFunc, []);
const declared = useMemo(() => {
  const callback: AsyncFunc = async () => {
    doSomething();
  };
  return callback;
}, []);
`,
          filename,
        },
        {
          // JSX attributes and assignments provide their own contract even under generic calls
          code: `
declare function doSomething(): void;
declare function Form(props: { onSubmit: () => Promise<void> }): any;
declare const targets: { handler: () => Promise<void> }[];
const forms = targets.map(() => <Form onSubmit={async () => { doSomething(); }} />);
const assigned = targets.map(target => (target.handler = async () => { doSomething(); }));
`,
          filename: path.join(import.meta.dirname, 'fixtures/placeholder.tsx'),
        },
        {
          code: `
interface Repository {
  save(): Promise<void>;
}
declare function register(repository: Repository): void;
declare function doSomething(): void;
const repository: Repository = {
  async save() {
    doSomething();
  },
};
register({
  async save() {
    doSomething();
  },
});
`,
          filename,
        },
      ],
      invalid: [
        {
          // `T` is inferred from the function itself
          code: `
declare function memoize<T extends (...args: any[]) => any>(fn: T): T;
declare function useStore<T>(options: T): T;
declare function doSomething(): void;
const memoized = memoize(async () => {
  doSomething();
});
const store = useStore({
  async save() {
    doSomething();
  },
  load: [async () => {
    doSomething();
  }],
});
`,
          errors: 3,
          filename,
        },
        {
          // `T` is inferred through returned values and conditionals
          code: `
declare function useMemo<T>(factory: () => T, deps: unknown[]): T;
declare function memoize<T extends (...args: any[]) => any>(fn: T): T;
declare function doSomething(): void;
declare const condition: boolean;
const callback = useMemo(() => async () => {
  doSomething();
}, []);
const factory = useMemo(() => {
  return async () => {
    doSomething();
  };
}, []);
const api = useMemo(() => ({
  async save() {
    doSomething();
  },
}), []);
const picked = memoize(condition ? async () => {
  doSomething();
} : async () => {
  doSomething();
});
`,
          errors: 5,
          filename,
        },
        {
          // `T` is inferred from the constructor argument, including inherited constructors
          code: `
declare function doSomething(): void;
class Box<T> {
  constructor(public value: T) {}
}
class Crate<T> extends Box<T> {}
new Box(async () => {
  doSomething();
});
new Box({
  async save() {
    doSomething();
  },
});
new Crate(async () => {
  doSomething();
});
`,
          errors: 3,
          filename,
        },
        {
          // the function's own return type is not a contract
          code: `
declare function doSomething(): void;
async function save(): Promise<void> {
  doSomething();
}
`,
          errors: 1,
          filename,
        },
        {
          code: `
interface Handler {
  handle(): Promise<void> | void;
}
declare function doSomething(): void;
class SyncHandler implements Handler {
  async handle() {
    doSomething();
  }
}
`,
          errors: 1,
          filename,
        },
        {
          code: `
interface Handler {
  handle(): Promise<void>;
}
declare function doSomething(): void;
class SyncHandler implements Handler {
  handle() {
    return Promise.resolve();
  }
  static async handle() { // Noncompliant: static members do not implement the interface
    doSomething();
  }
  async other() {
    doSomething();
  }
}
`,
          errors: 2,
          filename,
        },
        {
          code: `
declare function doSomething(): void;
const repository = {
  async save() {
    doSomething();
  },
};
`,
          errors: 1,
          filename,
        },
        {
          code: `
declare function doSomething(): void;
const callback: (() => void) | (() => Promise<void>) = async () => {
  doSomething();
};
`,
          errors: 1,
          filename,
        },
      ],
    });
  });

  it('known limitation: reports async callbacks passed to generic calls', () => {
    // Type arguments may be inferred from the callback itself, e.g. `useCallback(async () => {})`,
    // so generic calls are skipped even when `T` comes from an outer Promise-returning type.
    ruleTester.run('S7503 - generic calls', rule, {
      valid: [],
      invalid: [
        {
          code: `
declare const jest: { fn<T extends (...args: any[]) => any>(implementation?: T): T };
declare function withDependencies(dependencies: { callback: () => Promise<void> }): void;
declare function doSomething(): void;
withDependencies({
  callback: jest.fn(async () => {
    doSomething();
  }),
});
`,
          errors: 1,
          filename,
        },
        {
          // the parameter requires a Promise regardless of `K` and `V`, e.g. DataLoader's batch function
          code: `
declare function doSomething(): void;
declare class Loader<K, V> {
  constructor(batch: (keys: readonly K[]) => Promise<V[]>);
}
new Loader(async (keys: readonly string[]) => {
  doSomething();
  return keys.map(key => key.length);
});
`,
          errors: 1,
          filename,
        },
      ],
    });
  });

  it('known limitation: reports returned values whose type is any or unresolved', () => {
    // Promise recognition needs resolved types, e.g. a generated ORM client.
    ruleTester.run('S7503 - unresolved returned promises', rule, {
      valid: [],
      invalid: [
        {
          code: `
declare const client: any;
export const fn = async () =>
  client.run(async (handle: any) => {
    await handle.update();
  });
`,
          errors: 1,
          filename,
        },
        {
          code: `
import { model } from 'unresolved-module';
export const fn = async (id: string): Promise<number | null> =>
  model.find(id).then((item: any) => item.id);
`,
          errors: 1,
          filename,
        },
      ],
    });
  });

  it('known limitation: reports Promise-returning stubs that always throw', () => {
    // Detecting functions without normal completion requires code path analysis.
    ruleTester.run('S7503 - always-throwing stubs', rule, {
      valid: [],
      invalid: [
        {
          code: `
class MyClass {
  async method(arg: string): Promise<number> {
    void arg;
    throw new Error('Not implemented');
  }
}
`,
          errors: 1,
          filename,
        },
      ],
    });
  });

  it('known limitation: does not report async arrows with Promise-typed parameters', () => {
    // Upstream bug: require-await's expression-body selector also matches parameters.
    ruleTester.run('S7503 - Promise-typed parameters', rule, {
      valid: [
        {
          code: `
export const fn = async (promise: Promise<number>) => {
  return 1;
};
`,
          filename,
        },
        {
          code: `
declare const promise: Promise<number>;
export const fn = async (value = promise) => 1;
`,
          filename,
        },
      ],
      invalid: [],
    });
  });
});
