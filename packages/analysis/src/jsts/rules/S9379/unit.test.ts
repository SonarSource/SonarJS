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
import { doesNotThrow } from 'node:assert';
import { describe, it } from 'node:test';
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

const VALID_CASES = [
  { code: `<div />;` },
  // Autofocusing inside a `dialog` or a `popover` is exempt, direct child or nested descendant.
  { code: `<dialog><input autoFocus /></dialog>;` },
  { code: `<dialog><div><input autoFocus /></div></dialog>;` },
  { code: `<div popover><input autoFocus /></div>;` },
  // The `dialog`/`popover` element itself is a valid autofocus target.
  { code: `<dialog autoFocus></dialog>;` },
  { code: `<div popover autoFocus></div>;` },
  // An ARIA `dialog`/`alertdialog` role is a valid modal context too, whether it is an
  // ancestor or the autofocus-bearing element itself.
  { code: `<div role="dialog"><input autoFocus /></div>;` },
  { code: `<div role="alertdialog"><input autoFocus /></div>;` },
  { code: `<div role="dialog" autoFocus></div>;` },
  // An `autoFocus`-named prop on a custom component is not the DOM boolean attribute.
  { code: `<Input autoFocus />;` },
  // A custom element is not a recognized DOM tag either, even written all-lowercase.
  { code: `<my-input autoFocus />;` },
];

const INVALID_CASES = [
  {
    code: `<input autoFocus />;`,
    errors: [
      {
        message:
          'Remove this "autoFocus" attribute, as it can reduce usability and accessibility for users.',
      },
    ],
  },
  { code: `<input autoFocus="true" />;`, errors: 1 },
  { code: `<input autoFocus={undefined} />;`, errors: 1 },
  // Autofocus outside any dialog/popover ancestor is still reported, even inside an unrelated wrapper.
  { code: `<div><input autoFocus /></div>;`, errors: 1 },
  // A non-modal ARIA role does not exempt it.
  { code: `<div role="tooltip"><input autoFocus /></div>;`, errors: 1 },
  // A component whose name merely suggests a modal wrapper is not treated as one: only real
  // `dialog`/`popover` elements and ARIA `dialog`/`alertdialog` roles are exempt.
  { code: `<Dialog><input autoFocus /></Dialog>;`, errors: 1 },
];

describe('S9379', () => {
  it('should report autofocus outside a dialog/popover, and not report it inside one', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    doesNotThrow(() =>
      ruleTester.run('no-autofocus', rule, {
        valid: VALID_CASES,
        invalid: INVALID_CASES,
      }),
    );
  });
});
