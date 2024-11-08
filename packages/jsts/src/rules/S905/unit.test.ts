/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { fileURLToPath } from 'node:url';

const ruleTester = new NodeRuleTester({
  parser: fileURLToPath(import.meta.resolve('@typescript-eslint/parser')),
  parserOptions: { ecmaVersion: 2018 },
});

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
  ],
});
