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
import { rule } from './';
import { RuleTester } from 'eslint';
import { TypeScriptRuleTester } from '../tools';

const parserOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
};

const ruleTesterForVue = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
  parserOptions,
});
const ruleTester = new TypeScriptRuleTester();

const message = `Make sure bypassing Vue built-in sanitization is safe here.`;
const testName = 'Disabling Vue.js built-in escaping is security-sensitive';

ruleTesterForVue.run(testName, rule, {
  valid: [
    {
      code: `
      <template>
        <p class="footer"></p>
      </template>
      <script>
        alert('hello');
      </script>
      `,
    },
    {
      code: `
      <template>
      <div>
        <!-- normal href which is not a directive -->
        <a href="tainted">click here1</a> 
      </div>
      </template>`,
    },
  ],
  invalid: [
    {
      code: `
      <template>
        <p v-html="innerHtml"></p>
      </template>
      <script>

      </script>
      `,
      errors: [
        {
          message,
          line: 3,
          column: 12,
          endLine: 3,
          endColumn: 30,
        },
      ],
    },
    {
      code: `
      <template>
      <div>
        <a :href="tainted">click here1</a> <!-- Noncompliant -->
        <br>
        <a v-bind:href="tainted">click here2</a> <!-- Noncompliant -->
      </div>
      </template>
      `,
      errors: [
        { message, line: 4, column: 12, endLine: 4, endColumn: 27 },
        { message, line: 6, column: 12, endLine: 6, endColumn: 33 },
      ],
    },
  ],
});

ruleTester.run(`${testName} JSX`, rule, {
  valid: [{ code: `let x = <div class="bar">foo</div>` }],
  invalid: [
    {
      code: `
      let x = <div domPropsInnerHTML={this.message}></div>
      `,
      errors: [{ message, line: 2, column: 20, endLine: 2, endColumn: 52 }],
    },
  ],
});

ruleTester.run(`${testName} JS`, rule, {
  valid: [
    {
      code: `let x = { domProps: { }} `,
    },
    { code: `let x = { domProps: { prop: 'foo' } } ` },
    {
      code: `
       createElement({
                attrs: {
                    href: tainted 
                }
            },
            "click here2")
    `,
    },
    {
      code: `
       createElement('foo', {
                attrs: {
                    bar: 'x' 
                }
            },
            "click here2")
    `,
    },
    {
      code: `
       foo('foo', {
                attrs: {
                    bar: 'x' 
                }
            },
            "click here2")
    `,
    },
  ],
  invalid: [
    {
      code: `
        function f (createElement) {
          return createElement(
            'div',
            {
              domProps: {
                innerHTML: this.url
              }
            },
            'div test',
          );
        }
      `,
      errors: [{ message, line: 7, column: 17, endLine: 7, endColumn: 36 }],
    },

    {
      code: `
       Vue.component('custom-element2', {
          render: function (createElement) {
            return createElement('a', {
                attrs: {
                    href: tainted // Noncompliant
                }
            },
            "click here2")}})
      `,
      errors: [{ message, line: 6, column: 21, endLine: 6, endColumn: 34 }],
    },

    {
      code: `
       Vue.component('custom-element2', {
          render: function (h) {
            return h('a', {
                attrs: {
                    href: tainted // Noncompliant
                }
            },
            "click here2")}})
      `,
      errors: [{ message, line: 6, column: 21, endLine: 6, endColumn: 34 }],
    },

    {
      code: `
       createElement('foo',{
                attrs: {
                    href: tainted 
                }
            },
            "click here2")
    `,
      errors: 1,
    },
  ],
});
