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

describe('S5852', () => {
  it('S5852', () => {
    const ruleTesterTs = new NoTypeCheckingRuleTester();
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
        {
          code: String.raw`/\p{EMod}/u;`,
        },
        {
          // Polynomial-only (super-linear, non-exponential) — reported by S8786 instead
          code: `
      /([^,]*,)*/;
      new RegExp('x*$');
      `,
        },
        {
          // Polynomial-only real-world patterns — reported by S8786 instead
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
        },
        {
          code: `new RegExp('[\\x09\\x0A]*$');`,
        },
      ],
      invalid: [
        {
          code: `/(a+)+$/`,
          errors: [
            {
              message: `Fix this regular expression that is vulnerable to exponential backtracking, as it can lead to denial of service.`,
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 9,
            },
          ],
        },
        {
          code: String.raw`text.replace(/\033\[(\d+)*m/g, '');`,
          errors: [
            {
              message: `Fix this regular expression that is vulnerable to exponential backtracking, as it can lead to denial of service.`,
              line: 1,
            },
          ],
        },
      ],
    });
  });
});
