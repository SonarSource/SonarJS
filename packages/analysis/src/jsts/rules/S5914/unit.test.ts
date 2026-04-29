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
          code: `const value = true; expect(value).toBeTruthy();`,
          filename: jestFixture,
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(isReady()).toBeTruthy();
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
            assert.deepStrictEqual(getUser(), {});
          `,
        },
        {
          code: `const value: boolean = true; expect(value).toBeTruthy();`,
          filename: path.join(import.meta.dirname, 'fixtures', 'jest', 'test.ts'),
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
          code: `cy.wrap(true).should('be.true');`,
          filename: cypressFixture,
        },
        {
          code: `
            import { expect } from '@playwright/test';
            expect(page.locator('h1')).toHaveText('Hello');
          `,
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
            expect(null).not.toBeNull();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect({}).toBeTruthy();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(class {}).toBeDefined();
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect(getValue()).toBe({});
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { expect } from 'vitest';
            expect([]).not.toBe(getValue());
          `,
          errors: [{ messageId: 'issue' }],
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
          errors: [{ messageId: 'issue' }],
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
            assert(false);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), {});
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.notStrictEqual(getItems(), []);
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import assert from 'node:assert';
            assert.strictEqual(getValue(), new Value());
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import { strictEqual as same } from 'node:assert';
            same(getValue(), {});
          `,
          errors: [{ messageId: 'issue' }],
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
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import 'chai/register-should';
            getValue().should.equal({});
          `,
          errors: [{ messageId: 'issue' }],
        },
        {
          code: `
            import 'chai/register-should';
            ({}).should.be.ok;
          `,
          errors: [{ messageId: 'issue' }],
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
          errors: [{ messageId: 'issue' }],
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
          errors: [{ messageId: 'issue' }],
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
          errors: [{ messageId: 'issue' }],
        },
        // chai assert: fresh reference on the actual side
        {
          code: `
            import { assert } from 'chai';
            assert.notStrictEqual({}, getValue());
          `,
          errors: [{ messageId: 'issue' }],
        },
        // chai should-style with negation
        {
          code: `
            import 'chai/register-should';
            getValue().should.not.equal({});
          `,
          errors: [{ messageId: 'issue' }],
        },
      ],
    });
  });
});
