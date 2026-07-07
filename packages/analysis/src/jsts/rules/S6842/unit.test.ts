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
import { deepStrictEqual, ok } from 'node:assert';
import { describe, it } from 'node:test';
import { getUpstreamRecommendedConfiguration } from '../external/a11y.js';
import { defaultOptions } from '../helpers/configs.js';
import { fields } from './config.js';
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

type Allowlist = Record<string, string[]>;

function isAllowlist(
  configuration: Record<string, boolean | string[]>,
): configuration is Allowlist {
  return Object.values(configuration).every(Array.isArray);
}

const upstreamConfiguration = getUpstreamRecommendedConfiguration(
  'no-noninteractive-element-to-interactive-role',
);
if (!isAllowlist(upstreamConfiguration)) {
  throw new Error(
    'eslint-plugin-jsx-a11y: expected S6842 upstream config to contain only string[] values',
  );
}
const UPSTREAM_ALLOWLIST = upstreamConfiguration;
const LIST_CONTAINER_COMPOSITE_ROLES = [
  'listbox',
  'menu',
  'menubar',
  'radiogroup',
  'tablist',
  'toolbar',
  'tree',
];
const TABLE_COMPOSITE_ROLES = [...LIST_CONTAINER_COMPOSITE_ROLES, 'grid', 'treegrid'];
const TABLE_ALLOWED_ROLES = ['grid', ...LIST_CONTAINER_COMPOSITE_ROLES, 'treegrid'];
const EXPECTED_ALLOWLIST: Allowlist = {
  ...UPSTREAM_ALLOWLIST,
  ul: [...UPSTREAM_ALLOWLIST.ul, 'toolbar'],
  ol: [...UPSTREAM_ALLOWLIST.ol, 'toolbar'],
  table: TABLE_ALLOWED_ROLES,
  menu: LIST_CONTAINER_COMPOSITE_ROLES,
  tbody: TABLE_COMPOSITE_ROLES,
  thead: TABLE_COMPOSITE_ROLES,
  tfoot: TABLE_COMPOSITE_ROLES,
};

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
  ...allowlist.menu.map(role => ({
    code: `<menu role="${role}"><li>Item</li></menu>`,
    options: OPTIONS,
  })),
  ...allowlist.li.map(role => ({
    code: `<li role="${role}">Item</li>`,
    options: OPTIONS,
  })),
  ...allowlist.table.map(role => ({
    code: `<table role="${role}"><tr><td>Item</td></tr></table>`,
    options: OPTIONS,
  })),
  ...allowlist.tbody.map(role => ({
    code: `<table><tbody role="${role}"><tr><td>Item</td></tr></tbody></table>`,
    options: OPTIONS,
  })),
  ...allowlist.thead.map(role => ({
    code: `<table><thead role="${role}"><tr><th>Item</th></tr></thead></table>`,
    options: OPTIONS,
  })),
  ...allowlist.tfoot.map(role => ({
    code: `<table><tfoot role="${role}"><tr><td>Item</td></tr></tfoot></table>`,
    options: OPTIONS,
  })),
  ...COMPOSITE_VALID_CASES,
];

describe('S6842', () => {
  it('should expose the spec-compliant allowlist as default options', () => {
    deepStrictEqual(allowlist, EXPECTED_ALLOWLIST);
  });

  it('should not flag spec-compliant composite widget overrides', () => {
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
    ok(VALID_CASES.some(({ code }) => code === `<ul role="toolbar"><li>Item</li></ul>`));
    ok(VALID_CASES.some(({ code }) => code === `<ol role="toolbar"><li>Item</li></ol>`));
    ok(VALID_CASES.some(({ code }) => code === `<menu role="toolbar"><li>Item</li></menu>`));
    ok(
      VALID_CASES.some(
        ({ code }) => code === `<table role="treegrid"><tr><td>Item</td></tr></table>`,
      ),
    );
    ok(
      VALID_CASES.some(
        ({ code }) =>
          code === `<table><tbody role="toolbar"><tr><td>Item</td></tr></tbody></table>`,
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
        {
          code: `<menu role="button"><li>Item</li></menu>`,
          options: OPTIONS,
          errors: 1,
        },
        {
          code: `<table role="button"><tr><td>Item</td></tr></table>`,
          options: OPTIONS,
          errors: 1,
        },
        {
          code: `<table><tbody role="button"><tr><td>Item</td></tr></tbody></table>`,
          options: OPTIONS,
          errors: 1,
        },
      ],
    });
  });
});
