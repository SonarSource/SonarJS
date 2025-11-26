/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S6819', () => {
  it('should not flag custom components (false positive fix from community ticket)', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('prefer-tag-over-role - no false positives for custom components', rule, {
      valid: [
        {
          // Custom component from community ticket - should NOT be flagged
          code: `<mat-card role="region" aria-labelledby="reportsHeading" appearance="outlined">content</mat-card>`,
        },
        {
          // Another custom component
          code: `<my-component role="navigation">content</my-component>`,
        },
        {
          // Custom component with hyphen
          code: `<custom-button role="button">Click</custom-button>`,
        },
        {
          // Section with region role is valid (element already matches)
          code: `<section role="region">content</section>`,
        },
        {
          // Nav with navigation role is valid (element already matches)
          code: `<nav role="navigation">content</nav>`,
        },
      ],
      invalid: [
        {
          // Should flag: div should use semantic element
          code: `<div role="region">content</div>`,
          errors: 1,
        },
        {
          // Should flag: span should use button
          code: `<span role="button">Click</span>`,
          errors: 1,
        },
        {
          // Should flag: div should use nav
          code: `<div role="navigation">content</div>`,
          errors: 1,
        },
      ],
    });
  });
});
