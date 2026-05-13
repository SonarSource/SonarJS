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
import { deepStrictEqual, doesNotThrow, ok } from 'node:assert';
import { describe, it } from 'node:test';
import { defaultOptions } from '../helpers/configs.js';
import { fields } from './config.js';
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

const OPTIONS = defaultOptions(fields) as [{ ul: string[]; ol: string[]; li: string[] }];
const [allowlist] = OPTIONS;

const VALID_CASES = [
  ...allowlist.ul.map(role => ({
    code: `<ul role="${role}"><li>Item</li></ul>`,
    options: OPTIONS,
  })),
  ...allowlist.ol.map(role => ({
    code: `<ol role="${role}"><li>Item</li></ol>`,
    options: OPTIONS,
  })),
  ...allowlist.li.map(role => ({
    code: `<li role="${role}">Item</li>`,
    options: OPTIONS,
  })),
];

describe('S6842', () => {
  it('should expose the upstream recommended allowlist shape as default options', () => {
    deepStrictEqual(Object.keys(allowlist), ['ul', 'ol', 'li']);
    ok(allowlist.ul.length > 0);
    ok(allowlist.ol.length > 0);
    ok(allowlist.li.length > 0);
  });

  it('should not flag upstream recommended element/role combinations', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    doesNotThrow(() => {
      ruleTester.run('no-noninteractive-element-to-interactive-role', rule, {
        valid: VALID_CASES,
        invalid: [
          {
            code: `<ul role="button"><li>Item</li></ul>`,
            options: OPTIONS,
            errors: 1,
          },
          {
            code: `<ol role="button"><li>Item</li></ol>`,
            options: OPTIONS,
            errors: 1,
          },
          {
            code: `<li role="button">Foo</li>`,
            options: OPTIONS,
            errors: 1,
          },
        ],
      });
    });
  });
});
