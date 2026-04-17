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
import { rules as tsEslintRules } from '../external/typescript-eslint/index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S905 upstream sentinel', () => {
  it('upstream no-unused-expressions raises on comma operator sequences with side effects that decorator suppresses', () => {
    const upstreamRule = tsEslintRules['no-unused-expressions'];
    ruleTester.run('no-unused-expressions', upstreamRule, {
      valid: [],
      invalid: [
        { code: `a(), b();`, errors: 1 }, // sequence of calls — suppressed by decorator, raised by upstream
        { code: `++i, ++j;`, errors: 1 }, // sequence of updates — suppressed by decorator, raised by upstream
        { code: `x = 1, f();`, errors: 1 }, // assignment then call — suppressed by decorator, raised by upstream
      ],
    });
  });
});

describe('S905', () => {
  it('S905', () => {
    ruleTester.run('Disallow unused expressions', rule, {
      valid: [
        {
          code: `
        // valid assignments
        a = 0;
        x.y = 0;
        x[y] = 0;
        x.y += 0;
      `,
        },
        {
          code: `
        // valid function / method / constructor calls (presumably with side effects)
        doSomething();
        doSomething(usingArgs);
        obj.doSth();
        obj.doSth(args);
        new A();        
      `,
        },
        {
          code: `
        // valid method calls with null-coalescing operator
        obj?.doSth();
        obj?.x?.y?.doSth();
        f?.(arg1, arg2);
        f.g?.h?.();
      `,
        },
        {
          code: `
        // valid delete / void
        delete x['k'];
        void ok;
      `,
        },
        {
          code: `
        // valid chai code using 'should'-syntax
        t.should.be.ok;
        t.should.exist;
        a.should.be.arguments;
        [0].should.not.be.empty;
        foo.should.have.property("bar").with.empty;
      `,
        },
        {
          code: `
        // valid chai code using 'expect'-syntax
        expect(t).to.be.true;
        expect(u).to.be.undefined;
        expect(e).to.exist;
        expect({a}).to.not.be.frozen;
        expect(NaN).to.not.be.finite;
        expect(foo).to.have.property('bar').with.empty;
      `,
        },
        {
          code: `
        ({
          onClick: function(){/* ... */}
        });
      `,
        },
        // comma operator sequencing multiple function calls — all operands are calls with side effects
        {
          code: `
        for (let i = 0; i < items.length; i++) {
          output.push(items[i]), log.push(i);
        }
      `,
        },
        // comma operator sequencing increments — all operands are updates with side effects
        {
          code: `
        while (index < items.length) {
          ++index, ++total;
        }
      `,
        },
        // assignment then call — both operands have side effects
        {
          code: `
        while (lexer.pos < lexer.source.length) {
          escaped = true, advance();
        }
      `,
        },
        // call then multiple increments — all operands have side effects
        {
          code: `
        while (i < j) {
          swap(array, i, j), ++i, --j;
        }
      `,
        },
        // ternary where alternate branch is a comma-operator sequence of assignments
        {
          code: `condition ? (state.x = 0) : (state.y = 1, state.z = 2);`,
        },
        // logical expression where right side is a comma-operator sequence of calls
        {
          code: `condition && (f(), g());`,
        },
        // nested ternary (UMD-style) where all branches are assignments or calls
        {
          code: `cond1 ? module.exports = factory() : cond2 ? define(factory) : (g = this, g.lib = factory());`,
        },
        // sequence of test-framework calls separated by commas
        {
          code: `it('first test', function() { assert(true); }), it('second test', function() { assert(true); });`,
        },
      ],
      invalid: [
        {
          code: `
        // invalid isolated literals (surrounded by chai-tests)
        thisLine.should.be.ignored;
        42;
        expect(42).to.be.atLeast(40);
      `,
          errors: [
            {
              message: `Expected an assignment or function call and instead saw an expression.`,
              line: 4,
              endLine: 4,
              column: 9,
              endColumn: 12,
            },
          ],
        },
        {
          code: `
        // forgotten method calls (surrounded by chai-tests)
        thisLine.should.be.ignored(1234);
        someone.forgot().to[0].callAMethod;
        expect([]).to.be.empty;
      `,
          errors: [
            {
              message: `Expected an assignment or function call and instead saw an expression.`,
              line: 4,
              endLine: 4,
              column: 9,
              endColumn: 44,
            },
          ],
        },
        {
          code: `({})`,
          errors: [
            {
              message: `Expected an assignment or function call and instead saw an expression.`,
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 5,
            },
          ],
        },
        {
          code: `
        while (true) {
          ({
            onClick: function(){/* ... */}
          });
        }`,
          errors: [
            {
              message: `Expected an assignment or function call and instead saw an expression.`,
              line: 3,
              endLine: 5,
              column: 11,
              endColumn: 14,
            },
          ],
        },
        // sequence where one element has no side effect — still flagged
        {
          code: `a + b, c();`,
          errors: 1,
        },
      ],
    });
  });
});
