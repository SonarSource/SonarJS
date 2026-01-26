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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2699', () => {
  it('S2699', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(`Test cases must have assertions`, rule, {
      valid: [
        {
          code: `
const chai = require('chai');
const { expect } = chai;
describe('chai test cases', () => {
  it('expect', () => {
    expect(1).to.equal(2);
  });
  it('should go into function', () => {
    funcWithExpect();
  });
  it('repeated function calls should work', () => {
    funcWithExpect();
  });
});

function funcWithExpect() {
  expect(1).to.equal(2);
}
          `,
        },
        {
          code: `
const chai = require('chai');
describe('global expect', () => {
  it('expect', () => {
    expect(5).toEqual(4);
  });
});
          `,
        },
        {
          code: `
describe('no import from test library', () => {
  it('should not fail', () => {
    // no-op
  });
});
`,
        },
        // RxJS marble testing: expectObservable/expectSubscriptions should be recognized as assertions
        {
          code: `
const chai = require('chai');
describe('RxJS marble testing', () => {
  it('should recognize expectObservable as an assertion', () => {
    const observable = { toObservable: () => 'a' };
    expectObservable(observable).toBe('(a|)');
  });
});
`,
        },
        {
          code: `
const chai = require('chai');
describe('RxJS marble testing', () => {
  it('should recognize expectSubscriptions as an assertion', () => {
    const source = hot('----a----b----c----|');
    expectSubscriptions(source.subscriptions).toBe(['^ !']);
  });
});
`,
        },
        // expectTypeOf from vitest/expect-type libraries should be recognized as an assertion
        {
          code: `
const chai = require('chai');
describe('Type testing', () => {
  it('should recognize expectTypeOf as an assertion', () => {
    expectTypeOf({ a: 1 }).toEqualTypeOf();
  });
});
`,
        },
        // Mocha done() callback patterns that ARE assertions (false positives to fix)
        // Pattern 1: done(new Error(...)) in conditional branches - direct call with argument
        {
          code: `
const chai = require('chai');
describe('Observable.using', () => {
  it('should dispose of the resource when the subscription is disposed', (done) => {
    let disposed = false;
    const subscription = { unsubscribe: () => { disposed = true; } };
    subscription.unsubscribe();
    if (disposed) {
      done();
    } else {
      done(new Error('disposed should be true but was false'));
    }
  });
});
`,
        },
        // Pattern 2: done(new Error(...)) in subscribe-like callbacks - direct call with argument
        {
          code: `
const chai = require('chai');
describe('Observable.prototype.auditTime', () => {
  it('should not emit values when source completes immediately', (done) => {
    const onValue = (x) => {
      done(new Error('should not be called'));
    };
    const onComplete = () => {
      done();
    };
    onComplete();
  });
});
`,
        },
        // Pattern 3: .catch(done) - done receives rejection error
        {
          code: `
const chai = require('chai');
describe('Promise error handling', () => {
  it('should resolve without error', (done) => {
    asyncOperation()
      .then((result) => {
        done();
      })
      .catch(done);
  });
});
`,
        },
        // Pattern 4: .then(_, done) - done as second argument receives rejection
        {
          code: `
const chai = require('chai');
describe('Promise rejection handling', () => {
  it('should resolve without rejection', (done) => {
    asyncOperation()
      .then(
        (result) => { done(); },
        done
      );
  });
});
`,
        },
        // Pattern 5: .subscribe(_, done) - done as second argument (error position in RxJS)
        {
          code: `
const chai = require('chai');
describe('Observable error handling', () => {
  it('should complete without error', (done) => {
    observable.subscribe(
      (value) => {},
      done,
      () => { done(); }
    );
  });
});
`,
        },
        // Pattern 6: .subscribe({ error: done }) - done in error property
        {
          code: `
const chai = require('chai');
describe('Observable error handling with object syntax', () => {
  it('should complete without error using object subscription', (done) => {
    observable.subscribe({
      next: (value) => {},
      error: done,
      complete: () => { done(); }
    });
  });
});
`,
        },
      ],
      invalid: [
        {
          code: `
const chai = require('chai');
describe('chai test cases', () => {
  it('no assertion', () => {
    const x = 1 + 2;
  });
});`,
          errors: 1,
        },
        // expectX function without chained assertion method should still raise
        {
          code: `
const chai = require('chai');
describe('expectX without assertion', () => {
  it('should raise when expectSomething has no chained method', () => {
    expectSomething(value);
  });
});`,
          errors: 1,
        },
        // Tests using done() callback without assertions should still raise
        {
          code: `
const chai = require('chai');
describe('async tests', () => {
  it('should raise when only using done callback without assertions', (done) => {
    setTimeout(() => {
      done();
    }, 100);
  });
});`,
          errors: 1,
        },
        // done() in .finally() should still raise - finalize only signals completion, not assertion
        {
          code: `
const chai = require('chai');
describe('async tests with finally', () => {
  it('should raise when done is only in finally', (done) => {
    asyncOperation().finally(done);
  });
});`,
          errors: 1,
        },
        // done() as first argument to .then() should still raise - success position only
        {
          code: `
const chai = require('chai');
describe('async tests with then', () => {
  it('should raise when done is only first arg of then', (done) => {
    asyncOperation().then(done);
  });
});`,
          errors: 1,
        },
        // done() as first argument to .subscribe() should still raise - next position only
        {
          code: `
const chai = require('chai');
describe('async tests with subscribe', () => {
  it('should raise when done is only first arg of subscribe', (done) => {
    observable.subscribe(done);
  });
});`,
          errors: 1,
        },
        // done() as third argument to .subscribe() should still raise - complete position
        {
          code: `
const chai = require('chai');
describe('async tests with subscribe complete', () => {
  it('should raise when done is third arg of subscribe', (done) => {
    observable.subscribe(() => {}, () => {}, done);
  });
});`,
          errors: 1,
        },
        // RxJS finalize(done) should still raise - finalize calls callback without arguments
        {
          code: `
const chai = require('chai');
describe('async tests with RxJS finalize', () => {
  it('should raise when done is in finalize', (done) => {
    observable.pipe(finalize(done)).subscribe();
  });
});`,
          errors: 1,
        },
      ],
    });
    const typedRuleTester = new RuleTester();
    typedRuleTester.run('Test cases must have assertions', rule, {
      valid: [
        {
          code: `import { Mock } from "vitest";
          const input = Math.sqrt(4)
describe('no import from test library', () => {
  it('should not fail', () => {
      expect(input).to.equal(2) // chai API
  });
});`,
        },
        // RxJS marble testing in TypeScript: expectObservable/expectSubscriptions
        {
          code: `
import { expect } from 'chai';

declare function expectObservable(observable: any): { toBe: (expected: string) => void };
declare function expectSubscriptions(subscriptions: any): { toBe: (expected: string[]) => void };

describe('RxJS marble testing with types', () => {
  it('should recognize expectObservable as an assertion', () => {
    const observable = {};
    expectObservable(observable).toBe('(a|)');
  });

  it('should recognize expectSubscriptions as an assertion', () => {
    const subscriptions: any[] = [];
    expectSubscriptions(subscriptions).toBe(['^ !']);
  });
});
`,
        },
        // expectTypeOf in TypeScript
        {
          code: `
import { expect } from 'chai';

declare function expectTypeOf<T>(value: T): { toEqualTypeOf: <U>() => void; toBe: () => void };

describe('Type testing with expectTypeOf', () => {
  it('should recognize expectTypeOf as an assertion', () => {
    expectTypeOf({ a: 1 }).toEqualTypeOf<{ a: number }>();
  });
});
`,
        },
        // Chained property access: expectObservable(...).not.toBe(...)
        {
          code: `
import { expect } from 'chai';

declare function expectObservable(observable: any): { not: { toBe: (expected: string) => void }; toBe: (expected: string) => void };

describe('RxJS marble testing with chained access', () => {
  it('should recognize expectObservable with chained not.toBe', () => {
    const observable = {};
    expectObservable(observable).not.toBe('(a|)');
  });
});
`,
        },
        // TypeScript: done(new Error(...)) in conditional branches - direct call with argument
        {
          code: `
import { expect } from 'chai';

describe('Observable.using', () => {
  it('should dispose of the resource when the subscription is disposed', (done: (err?: Error) => void) => {
    let disposed = false;
    const subscription = { unsubscribe: () => { disposed = true; } };
    subscription.unsubscribe();
    if (disposed) {
      done();
    } else {
      done(new Error('disposed should be true but was false'));
    }
  });
});
`,
        },
        // TypeScript: .catch(done) - done receives rejection error
        {
          code: `
import { expect } from 'chai';

describe('Promise error handling', () => {
  it('should resolve without error', (done: (err?: Error) => void) => {
    const asyncOperation = (): Promise<number> => Promise.resolve(42);
    asyncOperation()
      .then((result) => {
        done();
      })
      .catch(done);
  });
});
`,
        },
        // TypeScript: .subscribe({ error: done }) - done in error property
        {
          code: `
import { expect } from 'chai';

interface Observer<T> {
  next?: (value: T) => void;
  error?: (err: Error) => void;
  complete?: () => void;
}

declare const observable: { subscribe: (observer: Observer<number>) => void };

describe('Observable error handling with object syntax', () => {
  it('should complete without error using object subscription', (done: (err?: Error) => void) => {
    observable.subscribe({
      next: (value) => {},
      error: done,
      complete: () => { done(); }
    });
  });
});
`,
        },
      ],
      invalid: [],
    });
  });
});
