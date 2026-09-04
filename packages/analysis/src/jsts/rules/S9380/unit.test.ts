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
  // The only conforming target for `scope`.
  { code: `<th scope="row">Total</th>;` },
  { code: `<th scope="col">Total</th>;` },
  // An element with no `scope` attribute at all is irrelevant to this rule.
  { code: `<div>Total</div>;` },
  // Known limitation: a non-DOM (custom) component is not resolvable to the DOM element it
  // eventually renders, so upstream does not flag it - even if it renders a `<td>`/`<div>`.
  { code: `<Table.Header scope="row">Total</Table.Header>;` },
  { code: `<CustomCell scope="row">Total</CustomCell>;` },
  // `<TH>` reads as the `th` tag but JSX treats it as a component reference, so it's skipped too.
  { code: `<TH scope="row">Total</TH>;` },
  { code: `<DIV scope="row">Total</DIV>;` },
  // A hyphenated custom element is valid JSX but not in aria-query's DOM tag set, so it's skipped too.
  { code: `<my-element scope="row">Total</my-element>;` },
];

const INVALID_CASES = [
  {
    code: `<div scope="row">Total</div>;`,
    errors: [
      { message: 'Remove this "scope" attribute, as it can only be used on "th" elements.' },
    ],
  },
  // The `td` case: valid in HTML4, deprecated in HTML5 - still reported, matching upstream.
  { code: `<td scope="row">Total</td>;`, errors: 1 },
  { code: `<span scope="col">Total</span>;`, errors: 1 },
  // Attribute-name casing does not exempt it: upstream compares case-insensitively.
  { code: `<div Scope="row">Total</div>;`, errors: 1 },
];

describe('S9380', () => {
  it('should report "scope" on anything other than a "th" DOM element', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    doesNotThrow(() =>
      ruleTester.run('scope', rule, {
        valid: VALID_CASES,
        invalid: INVALID_CASES,
      }),
    );
  });
});
