/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { rule } from 'rules/post-message';
import { RuleTesterTs } from '../RuleTesterTs';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new RuleTesterTs(false);

ruleTesterJs.run('No issues without types', rule, {
  valid: [
    {
      code: `
      var someWindow1 = window.open("url", "name");
      someWindow1.postMessage("message", "*");
            `,
    },
  ],
  invalid: [],
});

ruleTesterTs.run('Origins should be verified during cross-origin communications', rule, {
  valid: [
    {
      code: `
      var someWindow1 = window.open("url", "name");
      someWindow1.postMessage("message", "receiver");
            `,
    },
    {
      code: `
      postMessage("message", "receiver");
            `,
    },
    {
      code: `
      postMessage("message");
      postMessage("message", "*", "something", "something else");
            `,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        if (event.origin !== "http://example.org")
          return;
        console.log(event.data);
      });
            `,
    },
    {
      code: `
      window.addEventListener("missing listener");
      window.addEventListener("message", "not a function");
      not_a_win_dow.addEventListener("message", () => {});
      window.addEventListener("message", (/* missing event parameter */) => {});
      window.addEventListener("message", (...not_an_identifier) => {});
            `,
    },
  ],
  invalid: [
    {
      code: `
      var someWindow1 = window.open("url", "name");
      someWindow1.postMessage("message", "*");
            `,
      errors: 1,
    },
    {
      code: `
      postMessage("message", "*");
            `,
      errors: 1,
    },
    {
      code: `
      this.postMessage("message", "*");
            `,
      errors: 1,
    },
    {
      code: `
      var someWindow2 = document.getElementById("frameId").contentWindow;
      someWindow2.postMessage("message", "*");
            `,
      errors: 1,
    },
    {
      code: `
      var someWindow3 = window.frames[1];
      someWindow3.postMessage("message", "*");
            `,
      errors: 1,
    },
    {
      code: `
      getWindow().postMessage("message", "*");
            `,
      errors: 1,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        console.log(event.data);
      });
            `,
      errors: 1,
    },
    {
      code: `
      function eventHandler(event) {
        console.log(event.data);
      }
      window.addEventListener("message", eventHandler);
            `,
      errors: 1,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        if (event.data !== "http://example.org")
          return;
        console.log(event.data);
      });
            `,
      errors: 1,
    },
  ],
});
