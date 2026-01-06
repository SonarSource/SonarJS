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
      ],
      invalid: [],
    });
  });
});
