/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

const message =
  'Simplify this regular expression to reduce its runtime, as it has super-linear performance due to backtracking.';

describe('S8786', () => {
  it('S8786', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('super-linear-regex', rule, {
      valid: [
        {
          code: `
      /a|b|c/;
      /x*x*/;
      /a*(ab)*/;
      /x*|x*/;
      /a*b*/;
      /^a+b/;
      `,
        },
        {
          code: String.raw`/\p{EMod}/u;`,
        },
      ],
      invalid: [
        {
          code: `/a+b/`,
          errors: [{ message, line: 1 }],
        },
        {
          code: `/([^,]*,)*/`,
          errors: [{ message, line: 1 }],
        },
        {
          code: `new RegExp('x*$');`,
          errors: [{ message, line: 1 }],
        },
        {
          code: String.raw`/\s*$/`,
          errors: [{ message, line: 1 }],
        },
        {
          code: `/.*.*X/`,
          errors: [{ message, line: 1 }],
        },
        {
          code: `
      protocol.trim().split(/ *, */);
      var matcher = /.+\\@.+\\..+/;
      enclosure = /[{[].*\\/.*[}\\]]$/;
      f.replace(/\\/+$/, '');
      regex = /^(?:\\r\\n|\\n|\\r)+|(?:\\r\\n|\\n|\\r)+$/g;
      /^[\s\u200c]+|[\s\u200c]+$/;
      str.replace(/\s*$/, '');
      str.replace(/^\s+|\s+$/g, '');
      const entryPattern1 = /^(.)(.*?)\\t(.*?)\\t(.*?)\\t(.*?)\\u000d\\u000a$/
      const match = /^data:(?<type>.*?),(?<data>.*?)(?:#(?<hash>.*))?$/.exec(urlString);
      `,
          errors: [
            { message, line: 2 },
            { message, line: 3 },
            { message, line: 4 },
            { message, line: 5 },
            { message, line: 6 },
            { message, line: 7 },
            { message, line: 8 },
            { message, line: 9 },
            { message, line: 10 },
            { message, line: 11 },
          ],
        },
        {
          code: `new RegExp('[\\x09\\x0A]*$');`,
          errors: [{ message, line: 1 }],
        },
      ],
    });
  });
});
