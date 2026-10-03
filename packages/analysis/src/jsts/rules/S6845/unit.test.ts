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
import { rule } from './index.js';
import { rules } from '../external/a11y.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

const upstreamRule = rules['no-noninteractive-tabindex'];

describe('S6845 upstream sentinel', () => {
  it('upstream no-noninteractive-tabindex raises when a conditional only yields null or negative tab indexes', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-noninteractive-tabindex', upstreamRule, {
      valid: [],
      invalid: [
        {
          code: `<div tabIndex={disabled ? null : -1} />`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S6845', () => {
  it('should not flag conditionals whose every branch keeps a noninteractive element out of the tab order', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-noninteractive-tabindex', rule, {
      valid: [
        { code: `<div tabIndex={disabled ? null : -1} />` },
        { code: `<div tabIndex={disabled ? null : nested ? -1 : -2} />` },
      ],
      invalid: [
        {
          code: `<div tabIndex={disabled ? null : 0} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : tabIndex} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={0} />`,
          errors: 1,
        },
      ],
    });
  });
});
