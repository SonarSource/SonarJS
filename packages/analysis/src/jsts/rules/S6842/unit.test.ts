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
import { deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { defaultOptions } from '../helpers/configs.js';
import { fields } from './config.js';
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

type Allowlist = Record<string, string[]>;

const OPTIONS = defaultOptions(fields) as [Allowlist];

// The flat, spec-derived allowlist exposed as default options. Context-sensitive elements
// (li, img, figure, label), "any role" elements and the `toolbar` structure role are enforced
// by the decorator, not by these options.
const EXPECTED_ALLOWLIST: Allowlist = {
  ul: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree'],
  ol: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree'],
  menu: ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree'],
  nav: ['menu', 'menubar', 'tablist'],
  h1: ['tab'],
  h2: ['tab'],
  h3: ['tab'],
  h4: ['tab'],
  h5: ['tab'],
  h6: ['tab'],
  fieldset: ['radiogroup', 'presentation'],
  td: ['gridcell'],
  progress: ['progressbar'],
  li: [],
};

const LIST_CONTAINER_ROLES = ['listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree'];

const VALID_CASES = [
  // Composite list containers: every spec-allowed role, plus the `toolbar` structure role.
  ...['ul', 'ol', 'menu'].flatMap(tag =>
    [...LIST_CONTAINER_ROLES, 'toolbar'].map(role => ({
      code: `<${tag} role="${role}"><li>Item</li></${tag}>`,
      options: OPTIONS,
    })),
  ),
  // A list child may take any role once its parent no longer exposes the list role.
  { code: `<ul role="menu"><li role="menuitem">Item</li></ul>`, options: OPTIONS },
  { code: `<ol role="listbox"><li role="option">Item</li></ol>`, options: OPTIONS },
  { code: `<div><li role="button">Item</li></div>`, options: OPTIONS },
  { code: `<div role="navigation"><li role="menuitem">Item</li></div>`, options: OPTIONS },
  // nav / headings composite overrides.
  ...['menu', 'menubar', 'tablist'].map(role => ({
    code: `<nav role="${role}">Item</nav>`,
    options: OPTIONS,
  })),
  ...['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map(tag => ({
    code: `<${tag} role="tab">Item</${tag}>`,
    options: OPTIONS,
  })),
  { code: `<fieldset role="radiogroup"><legend>Label</legend></fieldset>`, options: OPTIONS },
  { code: `<fieldset role="presentation"><legend>Label</legend></fieldset>`, options: OPTIONS },
  { code: `<table><tr><td role="gridcell">Item</td></tr></table>`, options: OPTIONS },
  { code: `<progress role="progressbar" />`, options: OPTIONS },
  // "Any role" elements: table family and text-level elements accept any role.
  ...['button', 'grid', 'treegrid', 'menuitem'].flatMap(role =>
    ['table', 'tbody', 'thead', 'tfoot'].map(tag => ({
      code:
        tag === 'table'
          ? `<table role="${role}"><tr><td>Item</td></tr></table>`
          : `<table><${tag} role="${role}"><tr><td>Item</td></tr></${tag}></table>`,
      options: OPTIONS,
    })),
  ),
  ...['p', 'blockquote', 'time', 'output', 'abbr'].map(tag => ({
    code: `<${tag} role="button">Item</${tag}>`,
    options: OPTIONS,
  })),
  // img with an accessible name and a permitted role.
  { code: `<img alt="Logo" role="button" />`, options: OPTIONS },
  { code: `<img aria-label="Logo" role="tab" />`, options: OPTIONS },
  { code: `<img alt={label} role="button" />`, options: OPTIONS },
  { code: `<img aria-label={t('logo')} role="tab" />`, options: OPTIONS },
  { code: `<img aria-labelledby={computedId} role="link" />`, options: OPTIONS },
  // figure without a caption, and a non-associated label, accept any role.
  { code: `<figure role="button"><img alt="x" /></figure>`, options: OPTIONS },
  { code: `<label role="button">Text</label>`, options: OPTIONS },
];

const INVALID_CASES = [
  // treegrid is not permitted on ul/ol.
  { code: `<ul role="treegrid"><li>Item</li></ul>`, options: OPTIONS, errors: 1 },
  { code: `<ol role="treegrid"><li>Item</li></ol>`, options: OPTIONS, errors: 1 },
  // Non-composite interactive roles on list containers.
  { code: `<ul role="button"><li>Item</li></ul>`, options: OPTIONS, errors: 1 },
  { code: `<ol role="button"><li>Item</li></ol>`, options: OPTIONS, errors: 1 },
  { code: `<menu role="button"><li>Item</li></menu>`, options: OPTIONS, errors: 1 },
  // A list child inside a real list is restricted to listitem.
  { code: `<ul><li role="menuitem">Item</li></ul>`, options: OPTIONS, errors: 1 },
  { code: `<ul role="list"><li role="button">Item</li></ul>`, options: OPTIONS, errors: 1 },
  // img without an accessible name, or with a role it does not permit.
  { code: `<img role="button" />`, options: OPTIONS, errors: 1 },
  { code: `<img alt="" role="button" />`, options: OPTIONS, errors: 1 },
  { code: `<img alt={null} role="button" />`, options: OPTIONS, errors: 1 },
  { code: `<img aria-label={null} role="button" />`, options: OPTIONS, errors: 1 },
  { code: `<img aria-labelledby={null} role="button" />`, options: OPTIONS, errors: 1 },
  { code: `<img alt="Logo" role="combobox" />`, options: OPTIONS, errors: 1 },
  // figure with a caption, and an associated label, are restricted.
  {
    code: `<figure role="button"><figcaption>Cap</figcaption></figure>`,
    options: OPTIONS,
    errors: 1,
  },
  { code: `<label htmlFor="x" role="button">Name</label>`, options: OPTIONS, errors: 1 },
  { code: `<label role="button"><input type="text" /></label>`, options: OPTIONS, errors: 1 },
  // nav / headings / progress non-permitted roles.
  { code: `<nav role="listbox">Item</nav>`, options: OPTIONS, errors: 1 },
  { code: `<h1 role="button">Item</h1>`, options: OPTIONS, errors: 1 },
  { code: `<progress role="button" />`, options: OPTIONS, errors: 1 },
];

describe('S6842', () => {
  it('should expose the spec-derived flat allowlist as default options', () => {
    deepStrictEqual(OPTIONS[0], EXPECTED_ALLOWLIST);
  });

  it('should report only the element/role combinations forbidden by ARIA in HTML', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-noninteractive-element-to-interactive-role', rule, {
      valid: VALID_CASES,
      invalid: INVALID_CASES,
    });
  });
});
