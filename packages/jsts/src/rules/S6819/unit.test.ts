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
  it('should not flag custom components', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('prefer-tag-over-role - custom components', rule, {
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
      invalid: [],
    });
  });

  it('should not flag valid ARIA patterns where semantic equivalents lose functionality', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    // Test cases from JS-1100: Inline SVGs with ARIA roles flagged despite valid use cases
    // Algorithm from proposed-approach-20260122-160939.md
    ruleTester.run('prefer-tag-over-role - valid ARIA patterns', rule, {
      valid: [
        // Pattern 1: SVG with role="presentation" and aria-hidden="true" (decorative icon)
        // Per algorithm step 3: Suppress if aria-hidden="true" is present
        {
          code: `
            <svg
              aria-hidden="true"
              fill="none"
              focusable="false"
              height="1em"
              role="presentation"
              viewBox="0 0 24 24"
              width="1em"
            >
              <path d="M7.37 22h9.25" fill="currentColor" />
            </svg>
          `,
        },
        // Pattern 2: SVG with role="img" and aria-hidden="true" (decorative icon)
        // Per algorithm step 3: Suppress if aria-hidden="true" is present
        {
          code: `
            <svg
              aria-hidden="true"
              focusable="false"
              height="24"
              role="img"
              viewBox="0 0 512 512"
              width="24"
            >
              <path d="M160 136" stroke="currentColor" />
            </svg>
          `,
        },
        // Pattern 3: role="status" with aria-live (live region pattern)
        // Per algorithm step 4: Suppress if aria-live is present
        // The suggested <output> is for form calculation results, not general status messages
        {
          code: `
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="status-message"
            >
              Status message
            </div>
          `,
        },
        // Pattern 4: role="slider" with full aria-value attributes (custom slider)
        // Per algorithm step 5: Suppress if aria-valuemin, aria-valuemax, and aria-valuenow all present
        // Custom sliders need full styling control that <input type="range"> cannot provide
        {
          code: `
            <div
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={50}
              aria-label="Volume control"
            >
              <div className="slider-track" />
            </div>
          `,
        },
        // Pattern 5: role="radio" with aria-checked (custom radio control)
        // Per algorithm step 6: Suppress if aria-checked is present
        // Custom radios need full styling control that <input type="radio"> cannot provide
        {
          code: `
            <div
              role="radio"
              tabIndex={0}
              aria-checked={true}
              className="custom-radio"
            >
              <span className="custom-radio-indicator" />
            </div>
          `,
        },
        // Pattern 6: role="separator" with children (divider with text)
        // Per algorithm step 7: Suppress if element has children
        // The suggested <hr> is a void element that cannot contain children
        {
          code: `
            <div role="separator" className="divider-with-text">
              <span className="divider-line" />
              <span className="divider-text">OR</span>
              <span className="divider-line" />
            </div>
          `,
        },
      ],
      invalid: [
        // True positive: div should use semantic element
        {
          code: `<div role="region">content</div>`,
          errors: 1,
        },
        // True positive: span should use button
        {
          code: `<span role="button">Click</span>`,
          errors: 1,
        },
        // True positive: div should use nav
        {
          code: `<div role="navigation">content</div>`,
          errors: 1,
        },
      ],
    });
  });
});
