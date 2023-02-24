/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { BabelRuleTester, TypeScriptRuleTester } from '../../../tools';
import { rule } from 'linting/eslint/rules/no-dead-store';

const babelRuleTester = BabelRuleTester();

const valid = [
  {
    code: `
    function foo(cond) {
      let x = 1;
      if (cond) {
        foo(x);
      }
    }
   `,
  },
  {
    code: `
    var global1 = 42;
  `,
  },
  {
    code: `const {run} = Ember;`,
  },
  {
    code: `
    function functionParameter(p) { // OK
    }
    `,
  },
  {
    code: `
      function write_in_nested_function_expression() {
        var a = 42;
        executeConditionally(function() {
          a = z;
        });
        return a;
      }
    `,
  },
  {
    code: `
      function read_in_nested_function_expression() {
        var a = 42;
        var f = function() {
          return a;
        };
        a = 1; // OK
        return f;
      }`,
  },
  {
    code: `
      function read_in_nested_function_declaration() {
        var a = 42;
        function f() {
          return a;
        };
        a = 1; // OK
        return f;
      }`,
  },
  {
    code: `
      function read_in_nested_method() {
        var a = 42;
        class A {
          method1() {
            return a;
          }
        };
        a = 1; // OK
        return new A();
      }`,
  },
  {
    code: `
    function blockless_arrow_function() {
      doSomething(() => 1);
    }
    `,
  },
  {
    code: `
      function assignment_order() {
        var x = foo(); // OK
        x = bar(x);
        return baz(x);
      }
    `,
  },
  {
    code: `
    var globalCounter = 0;
    function getUniqueId() {
      return ++globalCounter;
    }
`,
  },
  {
    code: `
      var x = function loops() {
        let i = 0;
        let length;
        for (length = foo(); i < length; i++) {
        }
      }
    `,
  },
  {
    // this test case demonstrates that unreachable elements will not be part of any CodePathSegment
    // see https://eslint.org/docs/developer-guide/code-path-analysis#forstatement-for-ever
    code: `
    function forever() {
      for (;; ) {

      }
      foo();
    }
    `,
  },
  {
    code: `
      let x = 1;
      x = foo() ? x : 2;
    `,
  },
  {
    code: `
  function f(){
      const mod = "foo";
      switch (mod) {
        case "readonly":
          break;
        case "abstract":
          break;
      }
  }
  `,
  },
  {
    code: ` function f(){
      let {x} = bar();
      foo(x);
  }`,
  },
  {
    code: `
    function foo(map) {
      let i;
      for (const _ in map) {
        i++;
      }
    }
   `,
  },
  {
    code: `
        function f(a,b) {
          var d = (d = a - b) * d + (d = a - b) * d;
          foo(d);
        }
        `,
  },
  {
    code: `
    function f() {
      let {a, ...rest} = foo();
      bar(rest);

      let b;
      ({b, ...rest} = foo());
      bar(rest);
    }
  `,
  },
  {
    code: `
  var x; 
  function foo() {
    x = 5;
  }`,
  },
  {
    code: `
    function read_write() {
      var i = 42;
      var j = i++;
      doSomething(j);
    }`,
  },
  {
    code: `
    function foo() {
      let x = 42;
      console.log(x);
      x = null;
    }
  `,
  },
];

const invalid = [
  {
    code: `
    function foo(cond) {
      let x = 1;
      if (cond) {
        x = 2;
      }
    }
   `,
    errors: [
      {
        message: 'Remove this useless assignment to variable "x".',
        line: 5,
        endLine: 5,
        column: 9,
        endColumn: 10,
      },
    ],
  },
  noncompliant(`
      function foo(condition, a) {
        var x;
        x = 42; // Noncompliant
        if (condition) {
          x = 2;
        } else {
          x = a;
        }
        foo(x);
      }
    `),
  noncompliant(`
    function loops() {
      var i = 42;
      while(i < 10) {
        i = i + 1;
      }
      doSomething(i);

      var j;
      while (condition()) {
        j = k + 1; // Noncompliant
      }
    }`),
  noncompliant(`
    function write_in_nested_function_expression_but_never_read() {
      var a = 42; // Noncompliant
      execute(function() {
        a = z; // Noncompliant
      });
    }
    `),
  noncompliant(`
        function arrow_function() {
          doSomething(() => {
            var x = 42; // Noncompliant
            x = 43;
            return x;
          });
        }`),
  noncompliant(`
    class A {
      method1() {
        var x = 42; // Noncompliant
        return y;
      }
    }`),
  noncompliant(`
    function let_variable() {
      if (condition()) {
        let x = 42; // Noncompliant
      }
    }
    `),
  noncompliant(`
    //  -1, 0, 1, null, true, false, "" and void 0.
      function ok_initializer_to_standard_value() {
        let [a, b] = [42, 1]; // Noncompliant
        foo(a);

        let x0 = -2;  // Noncompliant
        let x1 = -1;
        let x2 = 0;
        let x3 = 1;
        let x4 = null;
        let x5 = true;
        let x6 = false;
        let x7 = "";
        let x8 = void 0;
        let x9 = (void 0);
        let x10 = (void 42);// Noncompliant
        let x11 = [];
        let x12 = {};
        let x13 = [1, 2]; // Noncompliant
        let x14 = {a: 1}; // Noncompliant
        let x15 = undefined;
        let x16 = -foo(); // Noncompliant

        x1 = 42;
        foo(x1);
        x2 = 42;
        foo(x2);
        x3 = 42;
        foo(x3);
        x4 = 42;
        foo(x4);
        x5 = 42;
        foo(x5);
        x6 = 42;
        foo(x6);
        x7 = 42;
        foo(x7);
        x8 = 42;
        foo(x8);
        x9 = 42;
        foo(x9);
        x15 = 42;
        foo(x15);

        x1 = -1;   // Noncompliant
        x2 = 0;   // Noncompliant
        x3 = 1;   // Noncompliant        
        x5 = true;   // Noncompliant
        x6 = false;   // Noncompliant
        x7 = "";   // Noncompliant
        x8 = void 0; // Noncompliant
        x9 = (void 0); // Noncompliant
        x15 = undefined; // Noncompliant

      }
    `),
  noncompliant(`
   function getIconSettings() {
    const Container = styled.div\`
        width: 26px;
        height: 26px;
      \`
      let attr = 42; // Noncompliant
      let value = 99;
      return (
       <Container attr={value}> </Container>
      )
    }
  `),
  noncompliant(`
    function f() {
      let {a, b} = foo(); // Noncompliant
      bar(a);

      let {x, ...rest} = foo(); // Noncompliant
      bar(x);
    }
  `),
  noncompliant(`
    function f() {
      // 'b' is ignored but 'unused' is reported
      let {unused, a: {b, ...rest}} = foo(); // Noncompliant
      foo(rest);
    }
  `),
];

babelRuleTester.run('Dead stores should be removed', rule, { valid, invalid });

const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterTs.run('Dead stores should be removed[TS]', rule, {
  valid: [
    {
      code: `
        const enum A {
          Monday = 1,
          Tuesday = 2
        }
    `,
    },
    {
      code: `
        class A {
          constructor(private concurrent: number = 42) { }
        }
        `,
    },
    {
      code: `
        namespace ts {
          export const version = "2.4.0";
        }
      `,
    },
    {
      code: `
        function getIconSettings() {
          const Container = styled.div\`
            width: 26px;
            height: 26px;
          \`

          return (
           <Container> </Container>
          )
        }
    `,
    },
  ],
  invalid: [],
});

function noncompliant(code: string) {
  const nonCompliantLines: number[] = [];
  code.split('\n').forEach((line, idx) => {
    if (line.includes('// Noncompliant')) {
      nonCompliantLines.push(idx + 1);
    }
  });
  return {
    code,
    errors: nonCompliantLines.map(l => {
      return { line: l };
    }),
  };
}
