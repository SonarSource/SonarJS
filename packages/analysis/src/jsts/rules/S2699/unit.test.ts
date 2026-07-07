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
import {
  DefaultParserRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
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
const chai = require('chai');
describe('chai should chains', () => {
  it('recognizes property and lengthOf chains', () => {
    const user = { pets: ['cat', 'dog', 'bird', 'fish'] };
    user.should.have.property('pets').with.lengthOf(4);
  });
});
          `,
        },
        {
          code: `
const chai = require('chai');
describe('chai should property assertions', () => {
  it('recognizes terminal assertion properties', () => {
    const warning = { isVisible: () => true };
    warning.isVisible().should.be.true;
  });
});
          `,
        },
        {
          code: `
const chai = require('chai');
describe('chai direct terminal should properties', () => {
  it('recognizes direct terminal properties and longer non-terminal chains', () => {
    const warning = {};
    warning.should.exist;

    const status = true;
    status.should.to.be.be.true;
  });
});
          `,
        },
        {
          code: `
const chai = require('chai');
describe('chai direct method should properties', () => {
  it('recognizes direct method assertions', () => {
    const value = 2;
    value.should.equal(2);

    const promiseResult = 2;
    promiseResult.should.eventually.equal(2);
  });
});
          `,
        },
        {
          code: `
const chai = require('chai');
describe('sinon-chai style terminal calls', () => {
  it('recognizes calledWith on should chains', () => {
    const submitPassword = { should: { have: { been: { calledWith: () => {} } } } };
    submitPassword.should.have.been.calledWith('secret');
  });
});
          `,
        },
        {
          code: `
const chai = require('chai');
const { assert } = chai;
describe('additional chai assert methods', () => {
  it('recognizes instance and is', () => {
    function Constructor() {}
    const value = new Constructor();
    assert.instance(value, Constructor);
    assert.is(value, value);
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
        {
          code: `
const assert = require('assert');
describe('assert imported without a supported test framework', () => {
  it('should not activate the rule', () => {
    const x = 1 + 2;
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
        {
          code: `
const chai = require('chai');
describe('bare should access', () => {
  it('should raise when should is not completed', () => {
    const user = {};
    user.should;
  });
});`,
          errors: 1,
        },
        {
          code: `
const chai = require('chai');
describe('incomplete should chains', () => {
  it('should raise when should only has language chains', () => {
    const value = true;
    value.should.to.be;
  });
});`,
          errors: 1,
        },
        {
          code: `
const chai = require('chai');
describe('unknown should chains', () => {
  it('should raise when should ends with an unknown property', () => {
    const helper = {};
    helper.should.eventually;
  });
});`,
          errors: 1,
        },
        {
          code: `
const chai = require('chai');
describe('terminal should chains with extra properties', () => {
  it('should raise when a terminal property is extended', () => {
    const helper = {};
    helper.should.exist.and;
  });
});`,
          errors: 1,
        },
        {
          code: `
const chai = require('chai');
describe('unrelated method names', () => {
  it('should raise when methods only look like assertions', () => {
    const helper = {
      property() {},
      lengthOf() {},
      calledWith() {},
    };
    helper.property('pets');
    helper.lengthOf(4);
    helper.calledWith('secret');
  });
});`,
          errors: 1,
        },
        {
          code: `
const chai = require('chai');
describe('shadowed assert helper', () => {
  it('should raise for local assert objects', () => {
    const assert = {
      instance() {},
      is() {},
      ok() {},
    };
    assert.instance({}, Object);
    assert.is(1, 1);
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
const mocha = require('mocha');
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
const mocha = require('mocha');
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
const mocha = require('mocha');
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
const mocha = require('mocha');
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
const mocha = require('mocha');
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
const mocha = require('mocha');
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

declare global {
  interface Object {
    should: any;
  }
}

describe('typed chai should chains', () => {
  it('should recognize property and lengthOf chains', () => {
    const user = { pets: ['cat', 'dog', 'bird', 'fish'] };
    user.should.have.property('pets').with.lengthOf(4);
  });

  it('should recognize terminal property assertions', () => {
    const warning = { isVisible: () => true };
    warning.isVisible().should.be.true;
  });

  it('should recognize property terminals beyond the common ones', () => {
    const list = [];
    list.should.be.empty;
  });

  it('should recognize direct terminal properties and longer non-terminal chains', () => {
    const payload = {};
    payload.should.exist;

    const status = true;
    status.should.to.be.be.true;

    const promiseResult = 2;
    promiseResult.should.eventually.equal(2);
  });

  it('should recognize call terminals on locals that do not resolve', () => {
    const value = 2;
    value.should.equal(2);
  });
});
`,
        },
        {
          code: `
import { assert, expect } from 'chai';

describe('typed chai assert additions', () => {
  it('should recognize instance and is', () => {
    class Constructor {}
    const value = new Constructor();
    assert.instance(value, Constructor);
    assert.is(value, value);
  });
});
`,
        },
        {
          code: `
const chai = require('chai');

declare global {
  interface Object {
    should: any;
  }
}

describe('typed commonjs chai should chains', () => {
  it('should recognize terminal property assertions', () => {
    const value = true;
    value.should.be.true;
  });
});
`,
        },
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
        {
          code: `
import test from 'node:test';
import assert from 'node:assert/strict';

declare const actual: string;
declare const expected: string;
declare const items: unknown[];
declare const message: string;

test('has assertions', () => {
  assert.equal(actual, expected);
  assert.deepEqual(items, []);
  assert.match(message, /ok/);
});
`,
        },
        {
          code: `
import test from 'node:test';
import * as assert from 'node:assert/strict';

declare const value: unknown;
declare const actual: string;
declare const unexpected: string;
declare const message: string;

test('has assertions', () => {
  assert.ok(value);
  assert.notEqual(actual, unexpected);
  assert.doesNotMatch(message, /error/);
});
`,
        },
        {
          code: `
import test from 'node:test';
import { equal, deepEqual, strictEqual, throws } from 'node:assert/strict';

declare const actual: string;
declare const expected: string;
declare const items: unknown[];
declare function run(): void;

test('has assertions', () => {
  equal(actual, expected);
  deepEqual(items, []);
  strictEqual(actual, expected);
  throws(() => run());
});
`,
        },
        {
          code: `
import test from 'node:test';
const assert = require('node:assert/strict');

declare const actual: string;
declare const expected: string;
declare function run(): void;

test('has assertions', () => {
  assert.equal(actual, expected);
  assert.doesNotThrow(() => run());
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
      invalid: [
        {
          code: `
import test from 'node:test';
import assert from 'node:assert/strict';

test('has no assertions', () => {
  const x = 1 + 2;
});
`,
          errors: 1,
        },
        {
          code: `
import { expect } from 'chai';

declare global {
  interface Object {
    should: any;
  }
}

describe('typed bare should access', () => {
  it('should raise when should is not extended', () => {
    const user = {};
    user.should;
  });
});
`,
          errors: 1,
        },
        {
          code: `
import { expect } from 'chai';

declare global {
  interface Object {
    should: any;
  }
}

describe('typed incomplete should chains', () => {
  it('should raise when should only has a language chain', () => {
    const value = true;
    value.should.to.be;
  });
});
`,
          errors: 1,
        },
        {
          code: `
import { expect } from 'chai';

declare global {
  interface Object {
    should: any;
  }
}

describe('typed unknown should chains', () => {
  it('should raise when should ends with an unknown property', () => {
    const helper = {};
    helper.should.eventually;
  });
});
`,
          errors: 1,
        },
        {
          code: `
import { expect } from 'chai';

declare global {
  interface Object {
    should: any;
  }
}

describe('typed terminal should chains with extra properties', () => {
  it('should raise when a terminal property is extended', () => {
    const helper = {};
    helper.should.exist.and;
  });
});
`,
          errors: 1,
        },
        {
          code: `
import { expect } from 'vitest';

describe('typed unrelated should chains', () => {
  it('should raise when should is not from chai', () => {
    const helper = { should: { eventually: () => {} } };
    helper.should.eventually();
  });
});
`,
          errors: 1,
        },
      ],
    });
  });
});
