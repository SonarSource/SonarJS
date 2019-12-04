/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import { RuleTesterTs } from "../RuleTesterTs";
import { rule } from "../../src/rules/post-message-check";

const ruleTester = new RuleTesterTs();
ruleTester.run(`Origins should be verified during cross-origin communications`, rule, {
  valid: [
    {
      code: `var someWindow1 = window.open("url", "name");
             someWindow1.minimize()`,
    },
    {
      code: `someContent = document.getElementById("frameId").contentWindow; // FN
               someContent.postMessage("message", "*");`,
    },
  ],
  invalid: [
    {
      code: `var someWindow1 = window.open("url", "name");
             someWindow1.postMessage("message", "*");`,
      errors: [
        {
          message: "Make sure this cross-domain message is being sent to the intended domain.",
          line: 2,
          column: 14,
          endLine: 2,
          endColumn: 53,
        },
      ],
    },
    {
      code: `someWindow2 = document.getElementById("frameId").contentWindow;
           someWindow2.postMessage("message", "*");`,
      errors: [
        {
          message: "Make sure this cross-domain message is being sent to the intended domain.",
        },
      ],
    },
    {
      code: `var someWindow3 = window.frames[1];
             someWindow3.postMessage("message", "*");`,
      errors: 1,
    },
    {
      code: `otherWindow.postMessage("message", "*");
               getWindow().postMessage("message", "*");`,
      errors: 2,
    },
    {
      code: `function foo(window, otherWindow){
                window.postMessage("message", "*");
               }`,
      errors: 1,
    },
    {
      code: `var someThing = window.open("url", "name");
               someThing.postMessage("message", "*");
               var someThingElse = window.frames[1];
               someThingElse.postMessage("message", "*");`,
      errors: 2,
    },
  ],
});
