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
import { TypeScriptRuleTester } from '../tools';
import { rule } from '../../src/rules/slow-regex';

const ruleTesterTs = new TypeScriptRuleTester();
ruleTesterTs.run('redos', rule, {
  valid: [
    {
      code: `
      /a|b|c/;
      /x*x*/;
      /a*(ab)*/;
      /x*|x*/;
      /a*b*/;
      `,
    },
  ],
  invalid: [
    {
      code: ` 
        /(a+)+$/
      `,
      errors: [
        {
          message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
          line: 2,
          endLine: 2,
          column: 9,
          endColumn: 17,
        },
      ],
    },
    {
      code: ` 
        /([^,]*,)*/; // FP? compliant in SonarJava tests
      `,
      errors: 1,
    },
    {
      code: ` 
        new RegExp('x*$');
      `,
      errors: 1,
    },
    {
      // Real vulnerabilities
      code: `
      protocol.trim().split(/ *, */);
      var matcher = /.+\\@.+\\..+/;
      enclosure = /[{[].*\\/.*[}\\]]$/;
      f.replace(/\\/+$/, '');
      regex = /^(?:\\r\\n|\\n|\\r)+|(?:\\r\\n|\\n|\\r)+$/g;
      text.replace(/\\033\\[(\\d+)*m/g, '');
      /^[\s\u200c]+|[\s\u200c]+$/;
      str.replace(/\s*$/, ''); // fixed by next line but it's reported
      str.replace(/^\s+|\s+$/g, '');
      const entryPattern1 = /^(.)(.*?)\\t(.*?)\\t(.*?)\\t(.*?)\\u000d\\u000a$/
      const entryPattern2 = /^(.)([^\\t]*)\\t([^\\t]*)\\t([^\\t]*)\\t([^\\t]*)\\r\\n$/   // OK, fix for previous one
      const match = /^data:(?<type>.*?),(?<data>.*?)(?:#(?<hash>.*))?$/.exec(urlString);
      const match = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/.exec(urlString); // OK, fix for previous one
      `,
      errors: [
        {
          line: 2,
        },
        {
          line: 3,
        },
        {
          line: 4,
        },
        {
          line: 5,
        },
        {
          line: 6,
        },
        {
          line: 7,
        },
        {
          line: 8,
        },
        {
          line: 9,
        },
        {
          line: 10,
        },
        {
          line: 11,
        },
        {
          line: 13,
        },
      ],
    },
    {
      // fails on Node 10
      code: `new RegExp('[\\x09\\x0A]*$');`,
      errors: 1,
    },
  ],
});
