/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { Rule } from 'eslint';
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { reportWithQuickFixIfApplicable } from './decorator.js';
import { it } from 'node:test';

const ruleTester = new NodeRuleTester({
  parserOptions: { ecmaVersion: 2022, ecmaFeatures: { jsx: true } },
});

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `function onSomething() {}`,
    },
    {
      code: `function f() { /* documented */ }`,
    },
    {
      code: `
        class Foo {
          f() { /* documented */ }
        }
      `,
    },
    {
      code: `
        class Foo {
          onSomething() {}
        }
      `,
    },
    {
      code: `
        class Foo {
          onSomething = function() {}
        }
      `,
    },
    {
      code: `
        class Foo {
          onSomething = () => {}
        }
      `,
    },
    {
      code: `
        const obj = {
          foo: function() {
          }
        };
      `,
    },
    {
      code: `
        class Foo {
          static defaultProps = {
            foo1: () => {},
            foo2() {}
          }
        }
      `,
    },
    {
      code: `
        Foo.defaultProps = {
          foo1: () => {},
          foo2() {}
        };
      `,
    },
    {
      code: `
        function Foo() {
          return <div onclick={() => {}} onfocus="{() => {}"></div>;
        }
      `,
    },
    {
      code: `
        function Foo() {
          return <div onclick={() => {}} onfocus="{function() {}"></div>;
        }
      `,
    },
    {
      code: `
        function foo({ bar = () => {} }) {
          bar();
        }
      `,
    },
    {
      code: `
        function foo(bar = () => {}) {
          bar();
        }
      `,
    },
    {
      code: `
        const onSomething = () => {};
      `,
    },
    {
      code: `(function() {})`,
    },
    {
      code: `() => {}`,
    },
    {
      code: `function myNoopFunction() {}`,
    },
  ],
  invalid: [
    {
      code: `function f() {}`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Insert placeholder comment',
              output: `function f() { /* TODO document why this function 'f' is empty */ }`,
            },
          ],
        },
      ],
    },
    {
      code: `
function f() {
}
`,
      errors: [
        {
          suggestions: [
            {
              output: `
function f() {
  // TODO document why this function 'f' is empty

}
`,
            },
          ],
        },
      ],
    },
    {
      code: `
class C {
  static get f() {
  }
}
`,
      errors: [
        {
          suggestions: [
            {
              output: `
class C {
  static get f() {
    // TODO document why this static getter 'f' is empty
  
  }
}
`,
            },
          ],
        },
      ],
    },
    {
      code: `const arrow = () => {}`,
      errors: [
        {
          suggestions: [
            {
              output:
                'const arrow = () => { /* TODO document why this arrow function is empty */ }',
            },
          ],
        },
      ],
    },
  ],
});

it('handles non function nodes', () => {
  reportWithQuickFixIfApplicable({} as Rule.RuleContext, {} as Rule.ReportDescriptor); // The call must not fail.
});
