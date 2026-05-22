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
import { deepStrictEqual, ok, throws } from 'node:assert';
import { describe, it } from 'node:test';
import { defaultOptions } from '../helpers/configs.js';
import { fields } from './config.js';
import { rule } from './index.js';
import { extractUpstreamAllowlist, getUpstreamAllowlist } from './upstream.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import type { Allowlist } from './upstream.js';

const UPSTREAM_ALLOWLIST = getUpstreamAllowlist();

const OPTIONS = defaultOptions(fields) as [Allowlist];
const [allowlist] = OPTIONS;
const COMPOSITE_VALID_CASES = [
  {
    code: `<ul role="listbox"><li role="option">Item</li></ul>`,
    options: OPTIONS,
  },
  {
    code: `<ol role="listbox"><li role="option">Item</li></ol>`,
    options: OPTIONS,
  },
  {
    code: `<table role="grid"><tr><td>Item</td></tr></table>`,
    options: OPTIONS,
  },
  {
    code: `<table><tr><td role="gridcell">Item</td></tr></table>`,
    options: OPTIONS,
  },
  {
    code: `<fieldset role="radiogroup"><legend>Label</legend></fieldset>`,
    options: OPTIONS,
  },
  {
    code: `<fieldset role="presentation"><legend>Label</legend></fieldset>`,
    options: OPTIONS,
  },
];

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
  ...COMPOSITE_VALID_CASES,
];

describe('S6842', () => {
  it('should fail clearly when the upstream allowlist cannot be read', () => {
    throws(
      () => extractUpstreamAllowlist({ configs: { recommended: { rules: {} } } }),
      /upstream allowlist.*not found/i,
    );
  });

  it('should expose the upstream recommended allowlist as default options', () => {
    deepStrictEqual(allowlist, UPSTREAM_ALLOWLIST);
  });

  it('should not flag upstream recommended element/role combinations', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ok(
      VALID_CASES.some(
        ({ code }) => code === `<ul role="listbox"><li role="option">Item</li></ul>`,
      ),
    );
    ok(
      VALID_CASES.some(
        ({ code }) => code === `<ol role="listbox"><li role="option">Item</li></ol>`,
      ),
    );
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
