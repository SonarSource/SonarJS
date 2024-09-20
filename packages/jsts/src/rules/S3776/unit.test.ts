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
import { RuleTester } from 'eslint';
import { rule } from './';
import { IssueLocation } from '../helpers';

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module', ecmaFeatures: { jsx: true } },
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run('cognitive-complexity', rule, {
  valid: [
    { code: `function zero_complexity() {}`, options: [0] },
    {
      code: `
      function Component(obj) {
        return (
          <span>{ obj.title?.text }</span>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
    },
    {
      code: `
      function Component(obj) {
        return (
          <>
              { obj.isFriendly && <strong>Welcome</strong> }
          </>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
    },
    {
      code: `
      function Component(obj) {
        return (
          <>
              { obj.isFriendly && obj.isLoggedIn && <strong>Welcome</strong> }
          </>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
    },
    {
      code: `
      function Component(obj) {
        return (
          <>
              { obj.x && obj.y && obj.z && <strong>Welcome</strong> }
          </>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
    },
    {
      code: `
      function Component(obj) {
        return (
          <span title={ obj.title || obj.disclaimer }>Text</span>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
    },
    {
      code: `
      function Component(obj) {
        return (
          <button type="button" disabled={ obj.user?.isBot ?? obj.isDemo }>Logout</button>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
    },
    {
      code: `
      function f(a, b, c) {
        const x = a || [];
        const y = b || {};
        const z = c ?? '';
      }`,
      options: [0],
    },
    {
      code: `
      function f(a, b, c) {
        a = a || [];
        b = b || {};
        c = c ?? '';
      }`,
      options: [0],
    },
  ],
  invalid: [
    testCaseWithSonarRuntime(
      `
      function check_secondaries() {
        if (condition) {       // +1 "if"
          if (condition) {} else {} // +2 "if", +1 "else"
          try {}
          catch (someError) {} // +2 "catch"
        } else { // +1
        }

        foo:
        while (cond) { // +1 "while"
          break foo; // +1 "break"
        }

        a ? 1 : 2; // +1 "?"

        switch (a) {} // +1 "switch"

        return foo(a && b) && c; // +1 "&&", +1 "&&"
      }`,
      [
        { message: '+1', column: 8, line: 3, endColumn: 10, endLine: 3 }, // if
        { message: '+1', column: 10, line: 7, endColumn: 14, endLine: 7 }, // else
        {
          message: '+2 (incl. 1 for nesting)',
          column: 10,
          line: 4,
          endColumn: 12,
          endLine: 4,
        }, // if
        { message: '+1', column: 28, line: 4, endColumn: 32, endLine: 4 }, // else
        {
          message: '+2 (incl. 1 for nesting)',
          column: 10,
          line: 6,
          endColumn: 15,
          endLine: 6,
        }, // catch
        { message: '+1', column: 8, line: 11, endColumn: 13, endLine: 11 }, // while
        { message: '+1', column: 10, line: 12, endColumn: 15, endLine: 12 }, // break
        { message: '+1', column: 10, line: 15, endColumn: 11, endLine: 15 }, // ?
        { message: '+1', column: 8, line: 17, endColumn: 14, endLine: 17 }, // switch
        { message: '+1', column: 27, line: 19, endColumn: 29, endLine: 19 }, // &&
        { message: '+1', column: 21, line: 19, endColumn: 23, endLine: 19 }, // &&
      ],
      13,
    ),

    // expressions
    testCaseWithSonarRuntime(
      `
      function and_or_locations() {
        foo(1 && 2 || 3 && 4);
      }`,
      [
        { message: '+1', column: 14, line: 3, endColumn: 16, endLine: 3 }, // &&
        { message: '+1', column: 19, line: 3, endColumn: 21, endLine: 3 }, // ||
        { message: '+1', column: 24, line: 3, endColumn: 26, endLine: 3 }, // &&
      ],
    ),
    {
      code: `
      function and_or() {
        foo(1 && 2 && 3 && 4); // +1
        foo((1 && 2) && (3 && 4)); // +1
        foo(((1 && 2) && 3) && 4); // +1
        foo(1 && (2 && (3 && 4))); // +1
        foo(1 || 2 || 3 || 4); // +1
        foo(1 && 2 || 3 || 4); // +2
        foo(1 && 2 || 3 && 4); // +3
        foo(1 && 2 && !(3 && 4)); // +2
      }`,
      options: [0],
      errors: [message(12)],
    },
    {
      code: `
      function conditional_expression() {
        return condition ? trueValue : falseValue;
      }`,
      options: [0],
      errors: [message(1)],
    },
    {
      code: `
      function nested_conditional_expression() {
        x = condition1 ? (condition2 ? trueValue2 : falseValue2) : falseValue1 ; // +3
        x = condition1 ? trueValue1 : (condition2 ? trueValue2 : falseValue2)  ; // +3
        x = condition1 ? (condition2 ? trueValue2 : falseValue2) : (condition3 ? trueValue3 : falseValue3); // +5
      }`,
      options: [0],
      errors: [message(11)],
    },
    {
      code: `
      function complexity_in_conditions(a, b) {
        if (a && b) {                            // +1(if) +1(&&)
          a && b;                                // +1 (no nesting)
        }
        while (a && b) {}                        // +1(while) +1(&&)
        do {} while (a && b)                     // +1(do) +1(&&)
        for (var i = a && b; a && b; a && b) {}  // +1(for) +1(&&)  +1(&&)  +1(&&)
      }`,
      options: [0],
      errors: [message(11)],
    },

    // different function types
    {
      code: 'var arrowFunction = (a, b) => a && b;',
      options: [0],
      errors: [message(1, { line: 1, endLine: 1, column: 28, endColumn: 30 })],
    },
    {
      code: 'var functionExpression = function(a, b) { return a && b; }',
      options: [0],
      errors: [message(1, { line: 1, endLine: 1, column: 26, endColumn: 34 })],
    },
    {
      code: `
      class A {
        method() {
          if (condition) {  // +1
            class B {}
          }
        }
      }`,
      options: [0],
      errors: [message(1, { line: 3, endLine: 3, column: 9, endColumn: 15 })],
    },
    {
      code: `
      class A {
        constructor() {
          if (condition) {}  // +1
        }
      }`,
      options: [0],
      errors: [message(1, { line: 3, endLine: 3, column: 9, endColumn: 20 })],
    },
    {
      code: `
      class A {
        set foo(x) {
          if (condition) {}  // +1
        }
        get foo() {
          if (condition) {}  // +1
        }
      }`,
      options: [0],
      errors: [
        message(1, { line: 3, endLine: 3, column: 13, endColumn: 16 }),
        message(1, { line: 6, endLine: 6, column: 13, endColumn: 16 }),
      ],
    },
    {
      code: `
      class A {
        ['foo']() {
          if (condition) {}  // +1
        }
      }`,
      options: [0],
      errors: [message(1, { line: 3, endLine: 3, column: 10, endColumn: 15 })],
    },
    {
      // here function is a function declaration, but it has no name (despite of the @types/estree definition)
      code: `
      export default function() {
        if (options) {}
      }`,
      options: [0],
      errors: [message(1, { line: 2, endLine: 2, column: 22, endColumn: 30 })],
    },

    // nested functions
    {
      code: `
      function nesting_func_no_complexity() {
        function nested_func() { // Noncompliant
          if (condition) {}      // +1
        }
      }`,
      options: [0],
      errors: [message(1, { line: 3 })],
    },
    {
      code: `
      function nesting_func_with_complexity() {  // Noncompliant
        if (condition) {}          // +1
        function nested_func() {                 // Noncompliant
          if (condition) {}        // +1
        }
      }`,
      options: [0],
      errors: [message(1, { line: 2 }), message(1, { line: 4 })],
    },
    {
      code: `
      function nesting_func_with_not_structural_complexity() {  // Noncompliant
        return a && b;             // +1
        function nested_func() {   // Noncompliant
          if (condition) {}        // +1
        }
      }`,
      options: [0],
      errors: [message(1, { line: 2 }), message(1, { line: 4 })],
    },
    {
      code: `
      function two_level_function_nesting() {
        function nested1() {
          function nested2() {    // Noncompliant
            if (condition) {}     // +1
          }
        }
      }`,
      options: [0],
      errors: [message(1, { line: 4 })],
    },
    {
      code: `
      function two_level_function_nesting_2() {
        function nested1() {     // Noncompliant
          if (condition) {}      // +1
          function nested2() {   // Noncompliant
            if (condition) {}    // +1
          }
        }
      }`,
      options: [0],
      errors: [message(1, { line: 3 }), message(1, { line: 5 })],
    },
    {
      code: `
      function with_complexity_after_nested_function() { // Noncompliant
        function nested_func() {                         // Noncompliant
          if (condition) {}        // +1
        }
        if (condition) {}          // +1
      }`,
      options: [0],
      errors: [message(1, { line: 2 }), message(1, { line: 3 })],
    },
    {
      code: `
      function nested_async_method() {
        class X {
          async method() {
            if (condition) {}      // +1
          }
        }
      }`,
      options: [0],
      errors: [message(1, { line: 4, column: 17, endColumn: 23 })],
    },

    // spaghetti
    {
      code: `
      (function(a) {  // Noncompliant
        if (cond) {}
        return a;
      })(function(b) {return b + 1})(0);`,
      options: [0],
      errors: [message(1)],
    },

    // ignore React functional components
    {
      code: `
      function Welcome() {
        const handleSomething = () => {
          if (x) {} // +1
        }
        if (x) {} // +1
        return <h1>Hello, world</h1>;
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
      errors: [message(1, { line: 2 }), message(1, { line: 3 })],
    },
    {
      code: `
      const Welcome = () => {
        const handleSomething = () => {
          if (x) {} // +1
        }
        if (x) {} // +1
        return <h1>Hello, world</h1>;
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
      errors: [message(1, { line: 2 }), message(1, { line: 3 })],
    },
    {
      code: `
      const Welcome = () => {
        const handleSomething = () => {
          if (x) {} // +1
        }
        if (x) {} // +1
        return (
          <>
            <h1>Hello, world</h1>
            <p>cat</p>
          </>
        );
      }`,
      parserOptions: { ecmaFeatures: { jsx: true } },
      options: [0],
      errors: [message(1, { line: 2 }), message(1, { line: 3 })],
    },
    testCaseWithSonarRuntime(
      `
      function Component(obj) {
        return (
          <>
            <span title={ obj.user?.name ?? (obj.isDemo ? 'demo' : 'none') }>Text</span>
          </>
        );
      }`,
      [
        { message: '+1', column: 41, line: 5, endColumn: 43, endLine: 5 }, // ??
        { message: '+1', column: 56, line: 5, endColumn: 57, endLine: 5 }, // ?:
      ],
    ),
    testCaseWithSonarRuntime(
      `
      function Component(obj) {
        return (
          <>
            { obj.isUser && (obj.name || obj.surname) }
          </>
        );
      }`,
      [
        { message: '+1', column: 25, line: 5, endColumn: 27, endLine: 5 }, // &&
        { message: '+1', column: 38, line: 5, endColumn: 40, endLine: 5 }, // ||
      ],
    ),
    testCaseWithSonarRuntime(
      `
      function Component(obj) {
        return (
          <>
            { obj.isUser && (obj.isDemo ? <strong>Demo</strong> : <em>None</em>) }
          </>
        );
      }`,
      [
        { message: '+1', column: 25, line: 5, endColumn: 27, endLine: 5 }, // &&
        { message: '+1', column: 40, line: 5, endColumn: 41, endLine: 5 }, // ||
      ],
    ),
  ],
});

ruleTester.run('cognitive-complexity 15', rule, {
  valid: [
    {
      code: `
      function foo() {
        if (a) {             // +1 (nesting level +1)
          if (b) {           // +2 (nesting level +1)
            if (c) {         // +3 (nesting level +1)
              if (d) {       // +4 (nesting level +1)
                if (e) {}    // +5 (nesting level +1)
              }
            }
          }
        }
      }`,
    },
  ],
  invalid: [
    {
      code: `
      function foo() {
        if (a) {             // +1 (nesting level +1)
          if (b) {           // +2 (nesting level +1)
            if (c) {         // +3 (nesting level +1)
              if (d) {       // +4 (nesting level +1)
                if (e) {     // +5 (nesting level +1)
                  if (f) {}  // +6 (nesting level +1)
                }
              }
            }
          }
        }
      }`,
      errors: [
        {
          messageId: 'refactorFunction',
          data: {
            complexityAmount: 21,
            threshold: 15,
          },
        },
      ],
    },
  ],
});

ruleTester.run('file-cognitive-complexity', rule, {
  valid: [],
  invalid: [
    {
      code: `
      a; // Noncompliant [[id=1]] {{25}}
function foo() {
  x && y;
//S ^^ 1 {{+1}}
  function foo1() {
    if (x) {}
//S ^^ 1 {{+1}}
  }
}

function bar() {
    if (x) {}
//S ^^ 1 {{+1}}
    function bar1() {
      if (x) {}
//S   ^^ 1 {{+2 (incl. 1 for nesting)}}
    }
}

    if (x) {
//S ^^ 1 {{+1}}
      function zoo() {
       x && y;
//S      ^^ 1 {{+1}}
       function zoo2() {
         if (x) {}
//S      ^^ 1 {{+2 (incl. 1 for nesting)}}
       }
      }

      function zoo1() {
        if (x) {}
//S     ^^ 1 {{+2 (incl. 1 for nesting)}}
      }

    }

x   && y;
//S ^^ 1 {{+1}}

    if (x) {
//S ^^ 1
      if (y) {
//S   ^^ 1
        function nested() {
          if (z) {}
//S       ^^ 1
          x && y;
//S         ^^ 1
        }
      }

      class NestedClass {

        innerMethod() {
          if (x) {}
//S       ^^ 1 {{+2 (incl. 1 for nesting)}}
        }

      }

    }

class TopLevel {

  someMethod() {
    if (x) {
//S ^^ 1 {{+1}}
      class ClassInClass {

        innerMethod() {
          if (x) {}
//S       ^^ 1 {{+3 (incl. 2 for nesting)}}
        }
      }
    }
  }
}
      `,
      options: [0, 'metric'],
      errors: [{ messageId: 'fileComplexity', data: { complexityAmount: 25 } }],
    },
  ],
});

function testCaseWithSonarRuntime(
  code: string,
  secondaryLocations: IssueLocation[],
  complexity?: number,
): RuleTester.InvalidTestCase {
  const cost = complexity ?? secondaryLocations.length;
  const message = `Refactor this function to reduce its Cognitive Complexity from ${cost} to the 0 allowed.`;
  const sonarRuntimeData = JSON.stringify({ message, secondaryLocations, cost });
  return {
    code,
    parserOptions: { ecmaFeatures: { jsx: true } },
    options: [0, 'sonar-runtime'],
    errors: [
      {
        messageId: 'sonarRuntime',
        data: {
          threshold: 0,
          sonarRuntimeData,
        },
      },
    ],
  };
}

function message(complexityAmount: number, other: RuleTester.TestCaseError = {}) {
  return {
    messageId: 'refactorFunction',
    data: { complexityAmount, threshold: 0 },
    ...other,
  };
}
