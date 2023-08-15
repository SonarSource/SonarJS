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
import { RuleTester } from 'eslint';
import { rule } from './';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run(`Objects should not be created to be dropped immediately without being used`, rule, {
  valid: [
    {
      code: `
      export default new MyConstructor();  // OK
      var something = new MyConstructor(); // OK
      something = new MyConstructor();     // OK
      callMethod(new MyConstructor());     // OK
      new MyConstructor().doSomething();   // OK
      `,
    },
    {
      code: `
      try { new MyConstructor(); } catch (e) {}
      try { if (cond()) { new MyConstructor(); } } catch (e) {}
      `,
    },
    {
      code: `new MyConstructor();`,
      settings: { fileType: 'TEST' },
    },
    {
      code: `
      new Notification("hello there");
      `,
    },
    {
      code: `
        import Vue from 'vue';
        new Vue();
      `,
    },
    {
      code: `
        const SomeAlias = require('vue');
        new SomeAlias();
      `,
    },
    {
      code: `
        import { Grid } from '@ag-grid-community/core';
        new Grid();
      `,
    },
    {
      code: `
        const { Grid } = require('@ag-grid-community/core');
        new Grid();
      `,
    },
  ],
  invalid: [
    {
      code: `new MyConstructor();
             new c.MyConstructor(123);`,
      errors: [
        {
          message: `Either remove this useless object instantiation of "MyConstructor" or use it.`,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 18,
        },
        {
          message: `Either remove this useless object instantiation of "c.MyConstructor" or use it.`,
          line: 2,
          column: 14,
          endLine: 2,
          endColumn: 33,
        },
      ],
    },
    {
      code: `
      new function() {
        //...
        // A lot of code...
      }`,
      errors: [
        {
          message: `Either remove this useless object instantiation or use it.`,
          line: 2,
          column: 7,
          endLine: 2,
          endColumn: 10,
        },
      ],
    },
    {
      code: `
      try {} catch (e) { new MyConstructor(); }
      `,
      errors: 1,
    },
    {
      code: `
        import Vue from 'not-vue';
        import { Grid } from 'not-ag-grid';
        new Vue();
        new Grid();
      `,
      errors: 2,
    },
    {
      code: `
        import Grid from '@ag-grid-community/core';
        new Grid();
      `,
      errors: 1,
    },
  ],
});
