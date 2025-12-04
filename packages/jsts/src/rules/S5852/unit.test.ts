/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S5852', () => {
  it('S5852', () => {
    const ruleTesterTs = new RuleTester();
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
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 2,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 3,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 4,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 5,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 6,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 7,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 8,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 9,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 10,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
              line: 11,
            },
            {
              message: `Make sure the regex used here, which is vulnerable to super-linear runtime due to backtracking, cannot lead to denial of service.`,
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
  });
});
