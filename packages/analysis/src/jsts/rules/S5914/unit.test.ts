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
import { describe, it } from 'node:test';
import path from 'node:path';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';

describe('S5914', () => {
  it('reports assertions that always succeed or fail', () => {
    process.chdir(import.meta.dirname);
    const ruleTester = new NoTypeCheckingRuleTester();
    const jestFixture = path.join(import.meta.dirname, 'fixtures', 'jest', 'test.js');
    const jasmineFixture = path.join(import.meta.dirname, 'fixtures', 'jasmine', 'test.js');
    const cypressFixture = path.join(import.meta.dirname, 'fixtures', 'cypress', 'test.js');
    const mochaFixture = path.join(import.meta.dirname, 'fixtures', 'mocha', 'test.js');
    const playwrightFixture = path.join(import.meta.dirname, 'fixtures', 'playwright', 'test.js');
    const noDependencyFixture = path.join(
      import.meta.dirname,
      'fixtures',
      'no-dependency',
      'test.js',
    );

    ruleTester.run('no-trivial-assertions', rule, {
      valid: [
        {
          code: `expect(true).toBeTruthy();`,
          filename: noDependencyFixture,
        },
        {
          code: `expect(true).to.be.true;`,
          filename: noDependencyFixture,
        },
        {
          code: `assert(false);`,
          filename: noDependencyFixture,
        },
        {
          code: `expect(true).toBeTruthy();`,
          filename: mochaFixture,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(isReady()).toBeTruthy();
          `,
        },
        // multi-write let cannot be resolved to a constant
        {
          code: `let value = true; value = false; expect(value).toBeTruthy();`,
          filename: jestFixture,
        },
        // single-write let is not resolved either (the write may run after the read inside a callback)
        {
          code: `
            import { expect } from 'vitest';
            let flag;
            const observer = { complete: () => { flag = true; } };
            observer.complete();
            expect(flag).toBeTruthy();
          `,
        },
        // var with a single write follows the same rule
        {
          code: `var value = true; expect(value).toBeTruthy();`,
          filename: jestFixture,
        },
        // const with a destructuring pattern is not resolved
        {
          code: `const { value } = { value: true }; expect(value).toBeTruthy();`,
          filename: jestFixture,
        },
        // mutually-recursive const references must not cause a stack overflow
        {
          code: `
            import { expect } from 'vitest';
            const a = b;
            const b = a;
            expect(a).toBeTruthy();
          `,
        },
        // function parameter has no write expression
        {
          code: `function f(x) { expect(x).toBeTruthy(); }`,
          filename: jestFixture,
        },
        // shadowed `undefined` must not be treated as the global constant
        {
          code: `function f(undefined) { expect(undefined).toBeTruthy(); }`,
          filename: jestFixture,
        },
        // import binding has no write expression
        {
          code: `
            import { expect } from 'vitest';
            import { CONST } from './constants';
            expect(CONST).toBeTruthy();
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(count()).toBe(0);
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getUser()).toEqual({ id: 1 });
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok(loadConfig());
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.fail("should not be called");
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.deepStrictEqual(getUser(), {});
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(Boolean(value)).toBeTruthy();
          `,
        },
        {
          code: `
            import { expect } from 'chai';
            expect(getValue()).to.deep.equal({});
          `,
        },
        {
          code: `
            import { assert } from 'chai';
            assert.deepEqual(getValue(), {});
          `,
        },
        {
          code: `cy.wrap(getValue()).should('be.true');`,
          filename: cypressFixture,
        },
        {
          code: `cy.wrap(getValue()).should('be.null');`,
          filename: cypressFixture,
        },
        {
          code: `
            import { expect } from '@playwright/test';
            expect(page.locator('h1')).toHaveText('Hello');
          `,
        },
        // awaited dynamic imports: non-constant actual must not be flagged
        {
          code: `const { expect } = await import('vitest');
            expect(getValue()).toBeTruthy();`,
        },
        {
          code: `const assert = await import('node:assert');
            assert.ok(getValue());`,
        },
        // identity comparison with primitives is meaningful — null/undefined are not fresh references
        {
          code: `
            import { expect } from 'vitest';
            expect(getValue()).not.toBe(null);
          `,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getValue()).not.toBe(undefined);
          `,
        },
        // chai expect-style: actual is a function call, not constant
        {
          code: `
            import { expect } from 'chai';
            expect(getValue()).to.be.true;
          `,
        },
        // chai should-style: actual is a function call, not constant
        {
          code: `
            import 'chai/register-should';
            getValue().should.not.be.null;
          `,
        },
        // identity comparison with non-fresh primitives is meaningful across libraries
        {
          code: `
            import { expect } from 'chai';
            expect(getValue()).to.equal(null);
          `,
        },
        {
          code: `
            import 'chai/register-should';
            getValue().should.equal(undefined);
          `,
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), null);
          `,
        },
        // chai expect with optional message argument
        {
          code: `
            import { expect } from 'chai';
            expect(getValue(), 'should match').to.equal(null);
          `,
        },
        // typeof on a non-constant identifier is not a constant
        {
          code: `
            import { expect } from 'vitest';
            expect(typeof getValue()).toBeTruthy();
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect } from 'vitest';
            expect(true).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(0).toBeFalsy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(undefined).toBeDefined();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(undefined).not.toBeDefined();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(null).not.toBeNull();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect({}).toBeTruthy();
          `,
          errors: [{ messageId: 'freshPredicate' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(class {}).toBeDefined();
          `,
          errors: [{ messageId: 'freshPredicate' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getValue()).toBe({});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect([]).not.toBe(getValue());
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `expect(true).toBeTruthy();`,
          filename: jestFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `expect(true).toBeTruthy();`,
          filename: jasmineFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `expect(getValue()).toBe({});`,
          filename: jasmineFixture,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok("ready");
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok(function handler() {});
          `,
          errors: [{ messageId: 'freshPredicate' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert(false);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), {});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.notStrictEqual(getItems(), []);
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), new Value());
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import { strictEqual as same } from 'node:assert';
            same(getValue(), {});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import { expect } from 'chai';
            expect(true).to.be.true;
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'chai';
            expect(true).to.be.ok;
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'chai';
            expect(getValue()).to.equal({});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import { assert } from 'chai';
            assert.ok("ready");
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { assert } from 'chai';
            assert.strictEqual(getValue(), {});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import 'chai/register-should';
            "done".should.be.ok;
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import 'chai/register-should';
            getValue().should.equal({});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import 'chai/register-should';
            ({}).should.be.ok;
          `,
          errors: [{ messageId: 'freshPredicate' }],
        },
        {
          code: `
            import { expect } from '@playwright/test';
            expect(true).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `expect(true).toBeTruthy();`,
          filename: playwrightFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `expect(true).to.be.true;`,
          filename: cypressFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `assert.strictEqual(getValue(), {});`,
          filename: cypressFixture,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `cy.wrap(true).should('be.true');`,
          filename: cypressFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `cy.wrap(null).should('be.null');`,
          filename: cypressFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `cy.wrap(undefined).should('be.undefined');`,
          filename: cypressFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `cy.wrap(false).should('not.be.ok');`,
          filename: cypressFixture,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `cy.wrap(true).should('exist').and('be.true');`,
          filename: cypressFixture,
          errors: [{ messageId: 'issue' }, { messageId: 'issue' }],
        },
        // awaited dynamic imports are detected the same as static imports
        {
          code: `const { expect } = await import('vitest');
            expect(true).toBeTruthy();`,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `const { expect } = await import('vitest');
            expect(null).not.toBeNull();`,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `const { expect } = await import('vitest');
            expect(getValue()).toBe({});`,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `const assert = await import('node:assert');
            assert.ok(false);`,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `const assert = await import('node:assert');
            assert.strictEqual(getValue(), {});`,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // unary expressions produce constant values
        {
          code: `
            import { expect } from 'vitest';
            expect(-1).toBeFalsy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(!false).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.ok(!false);
          `,
          errors: [{ messageId: 'issue' }],
        },
        // logical expressions produce constant values
        {
          code: `
            import { expect } from 'vitest';
            expect(true && false).toBeFalsy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(null ?? 'x').toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        // NewExpression on the actual side
        {
          code: `
            import { expect } from 'vitest';
            expect(new Map()).toBeTruthy();
          `,
          errors: [{ messageId: 'freshPredicate' }],
        },
        // template literal
        {
          code: `
            import { expect } from 'vitest';
            expect(\`hello\`).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        // node:assert/strict module
        {
          code: `
            import assert from 'node:assert/strict';
            assert.ok(false);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert/strict';
            assert.strictEqual(getValue(), {});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // chai assert: fresh reference on the actual side
        {
          code: `
            import { assert } from 'chai';
            assert.notStrictEqual({}, getValue());
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // chai should-style with negation
        {
          code: `
            import 'chai/register-should';
            getValue().should.not.equal({});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // chai assert.equal / assert.notEqual (loose equality is just as trivial against fresh refs)
        {
          code: `
            import { assert } from 'chai';
            assert.equal(getValue(), {});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        {
          code: `
            import { assert } from 'chai';
            assert.notEqual(getItems(), []);
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // chai expect with optional message argument is still analyzed
        {
          code: `
            import { expect } from 'chai';
            expect(true, 'should be true').to.be.true;
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'chai';
            expect(getValue(), 'msg').to.equal({});
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // identity comparison of two constant primitives is statically known
        {
          code: `
            import { expect } from 'vitest';
            expect(true).toBe(true);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(1, 2);
          `,
          errors: [{ messageId: 'issue' }],
        },
        // regex literals create a fresh RegExp on each evaluation
        {
          code: `
            import { expect } from 'vitest';
            expect(/foo/).toBeTruthy();
          `,
          errors: [{ messageId: 'freshPredicate' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getValue()).toBe(/foo/);
          `,
          errors: [{ messageId: 'freshIdentity' }],
        },
        // void X is always undefined
        {
          code: `
            import { expect } from 'vitest';
            expect(void getValue()).toBeUndefined();
          `,
          errors: [{ messageId: 'issue' }],
        },
        // typeof of a constant is constant
        {
          code: `
            import { expect } from 'vitest';
            expect(typeof undefined).toBe('undefined');
          `,
          errors: [{ messageId: 'issue' }],
        },
        // chai BDD `.exist` (and its `.exists` alias) — equivalent to assert-style `.exists()`
        {
          code: `
            import { expect } from 'chai';
            expect(null).to.exist;
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'chai';
            expect(undefined).to.exists;
          `,
          errors: [{ messageId: 'issue' }],
        },
        // const-bound boolean primitive (jest fixture, predicate)
        {
          code: `const value = true; expect(value).toBeTruthy();`,
          filename: jestFixture,
          errors: [{ messageId: 'issue' }],
        },
        // TypeScript-annotated const with a binary expression initializer
        {
          code: `const limit: number = 10 + 5; expect(limit).toBeTruthy();`,
          filename: path.join(import.meta.dirname, 'fixtures', 'jest', 'test.ts'),
          errors: [{ messageId: 'issue' }],
        },
        // const bound to a unary expression on a constant
        {
          code: `
            import { expect } from 'vitest';
            const negated = !true;
            expect(negated).toBeFalsy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        // const bound to a logical expression on constants (chai)
        {
          code: `
            import { expect } from 'chai';
            const both = true && false;
            expect(both).to.be.false;
          `,
          errors: [{ messageId: 'issue' }],
        },
        // const bound to a template literal without interpolation (jasmine)
        {
          code: `const greeting = \`hello\`; expect(greeting).toBeTruthy();`,
          filename: jasmineFixture,
          errors: [{ messageId: 'issue' }],
        },
        // identity comparison following a chain of consts
        {
          code: `
            import { expect } from 'vitest';
            const a = 1;
            const b = a;
            expect(b).toBe(1);
          `,
          errors: [{ messageId: 'issue' }],
        },
        // expected-side const with a binary expression initializer (chai)
        {
          code: `
            import { expect } from 'chai';
            const total = 4 * 25;
            expect(100).to.equal(total);
          `,
          errors: [{ messageId: 'issue' }],
        },
        // node:assert predicate on a const-bound primitive
        {
          code: `
            import assert from 'node:assert';
            const flag = false;
            assert(flag);
          `,
          errors: [{ messageId: 'issue' }],
        },
      ],
    });
  });
});
