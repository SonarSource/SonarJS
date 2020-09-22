/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { RuleTester, Rule } from 'eslint';
import {
  decorateTypescriptEslint,
  decorateJavascriptEslint,
} from 'rules/no-unused-expressions-decorator';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018 },
});

const rule: Rule.RuleModule = decorateTypescriptEslint(
  require('@typescript-eslint/eslint-plugin').rules!['no-unused-expressions'],
);

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
  ],
});

import { rules as chaiFriendlyRules } from 'eslint-plugin-chai-friendly';

for (let { parser, languageSpecificRule } of [
  {
    parser: '@typescript-eslint/parser',
    languageSpecificRule: decorateTypescriptEslint(
      require('@typescript-eslint/eslint-plugin').rules!['no-unused-expressions'],
    ),
  },
  {
    parser: 'babel-eslint',
    languageSpecificRule: decorateJavascriptEslint(chaiFriendlyRules['no-unused-expressions']),
  },
]) {
  const tester = new RuleTester({
    parser: require.resolve(parser),
    parserOptions: { ecmaVersion: 2018 },
  });

  tester.run(`Disallow unused expressions - negations & IIFE (${parser})`, languageSpecificRule, {
    valid: [
      {
        code: `
          iife.with.unaryNegation().should.be.exempt;
          !function(){ console.log("side effect!"); }();
        `,
      },
    ],
    invalid: [
      {
        code: `
          all(other).useless.negations.should.not.be.exempt;
          !foo().bar();
          !!function(){}();
        `,
        errors: 2,
      },
    ],
  });

  tester.run(`Disallow unused expressions - sequences (${parser})`, languageSpecificRule, {
    valid: [
      {
        code: `
          let a, b, c;
          a = 1, b = 2, c = 3;`,
      },
    ],
    invalid: [
      {
        code: `
          let a, b, c;
          a = 1, b, c;
        `,
        errors: 1,
      },
    ],
  });
}
