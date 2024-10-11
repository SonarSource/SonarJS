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
import { rule } from './index.js';
import { NodeRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { TypeScriptRuleTester } from '../../../tests/tools/index.js';

const ruleTesterJs = new NodeRuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

ruleTesterJs.run('No issues without types', rule, {
  valid: [
    {
      code: `
      var script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js"; // Sensitive
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
  ],
  invalid: [],
});

ruleTesterTs.run('Disabling resource integrity features is security-sensitive', rule, {
  valid: [
    {
      code: `
      var script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";  // Compliant
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      var script = document.createElement("script");
      script.src = getSource();
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      var script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      if (x) {
        script.src = getSource();
      }
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      var script = document.other("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      if (x) {
        script.src = getSource();
      }
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      var script = other.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      if (x) {
        script.src = getSource();
      }
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      // Coverage
      var script = getScript();
      script.src = getSource();
      var [a, b] = getArray();
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      var script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      var other = script.src;
      script.integrity = "sha256-CSXorXvZcTkaix6Yvo6HppcZGetbYMGWSFlBw8HfCJo=";  // Compliant
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
      var script = document.createElement("other");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
    },
    {
      code: `
        if (cond) {
          var script = document.createElement( "script" );
          script.src = "https://code.jquery.com/jquery-3.4.1.min.js"; // FN (missing variable)
        }
            `,
    },
  ],
  invalid: [
    {
      code: `
      var script = document.createElement("script");
      script.src = "https://code.jquery.com/jquery-3.4.1.min.js"; // Sensitive
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
      errors: [
        {
          line: 2,
          endLine: 2,
          column: 11,
          endColumn: 52,
          message: 'Make sure not using resource integrity feature is safe here.',
        },
      ],
    },
    {
      code: `
      var script = document.createElement("script");
      script.src = "//code.jquery.com/jquery-3.4.1.min.js"; // Sensitive
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
            `,
      errors: 1,
    },
  ],
});
