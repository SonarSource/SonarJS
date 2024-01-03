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
import { TypeScriptRuleTester } from '../tools';
import { rule } from './';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

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
      window.addEventListener("message", () => {}); // missing event parameter
      window.addEventListener("message", (...not_an_identifier) => {});
            `,
    },
    {
      code: `
      window.addEventListener("click", function(event) { // OK: event type is not "message"
        if (event.data !== "http://example.org")
          return;
        console.log(event.data);
      });
            `,
    },
    {
      code: `
      const processEvent = event => {
        if (event.origin !== "http://example.org") return
      }
      window.addEventListener('message', processEvent);
      `,
    },
    {
      code: `
      const processEvent = event => {
        if (event.origin !== "http://example.org") return
      }
      window.addEventListener('message', event => processEvent(event));
      `,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        if (event.originalEvent.origin !== "http://example.org")
          return;
      });
      `,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        if (event.originalEvent.origin === "http://example.org" || event.origin === "http://example.org")
          return;
      });
      `,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        const _event = event.originalEvent || event;
        if (_event.origin !== "http://example.org")
          return;
      });
      window.addEventListener("message", function(event) {
        const _event = event || event.originalEvent;
        if (_event.origin !== "http://example.org")
          return;
      });
      `,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        var origin =  event.originalEvent.origin || event.origin
        if (origin !== "http://example.org")
          return;
      });
      window.addEventListener("message", function(event) {
        var origin =  event.origin || event.originalEvent.origin
        if (origin !== "http://example.org")
          return;
      });
      `,
    },
  ],
  invalid: [
    {
      code: `
      var someWindow1 = window.open("url", "name");
      someWindow1.postMessage("message", "*");
            `,
      errors: [{ messageId: 'specifyTarget' }],
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
      errors: [{ messageId: 'verifyOrigin' }],
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
    {
      code: `
      const eventType = "message";
      window.addEventListener(eventType, function(event) {
        if (event.data !== "http://example.org")
          return;
        console.log(event.data);
      });
            `,
      errors: 1,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        var origin =  event.originalEvent.origin || event.origin; // coverage: must be tested
      });
      `,
      errors: 1,
    },
    {
      code: `
      window.addEventListener("message", function(event) {
        event.originalEvent.origin || event.origin; // coverage: we don't assign this anywhere
      });
      `,
      errors: 1,
    },
  ],
});
