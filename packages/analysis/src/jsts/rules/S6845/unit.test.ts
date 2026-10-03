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
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rules } from '../external/a11y.js';
import { rule } from './index.js';

// Sentinel: verify that the upstream ESLint rule still raises on the pattern our decorator fixes.
// If this test starts failing, the decorator can be safely removed.
describe('S6845 upstream sentinel', () => {
  it('upstream no-noninteractive-tabindex reports complete separator widgets', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-noninteractive-tabindex', rules['no-noninteractive-tabindex'], {
      valid: [],
      invalid: [
        {
          code: `<div role="separator" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} tabIndex={0} />`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S6845', () => {
  it('allows tabIndex on a statically complete separator widget only', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('no-noninteractive-tabindex', rule, {
      valid: [
        {
          code: `<div role="separator" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} tabIndex={0} />`,
        },
      ],
      invalid: [
        { code: `<div role="separator" tabIndex={0} />`, errors: 1 },
        { code: `<div role="separator" aria-valuenow={50} tabIndex={0} />`, errors: 1 },
        {
          code: `<div role="separator" aria-valuemin={0} aria-valuemax={100} aria-valuenow={current} tabIndex={0} />`,
          errors: 1,
        },
        {
          code: `<div role="separator" aria-valuemin={0} aria-valuemax={100} aria-valuenow={101} tabIndex={0} />`,
          errors: 1,
        },
        {
          code: `<div role="separator" aria-valuemin="" aria-valuemax="100" aria-valuenow="50" tabIndex={0} />`,
          errors: 1,
        },
        {
          code: `<div role="separator" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} {...props} tabIndex={0} />`,
          errors: 1,
        },
        {
          code: `<Separator role="separator" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50} tabIndex={0} />`,
          settings: { 'jsx-a11y': { components: { Separator: 'div' } } },
          errors: 1,
        },
      ],
    });
  });
});
