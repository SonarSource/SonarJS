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

  // Test for JS-1101: role="img" flagged on non-image visual content and containers
  // These tests demonstrate false positives that occur when role="img" is used on
  // div/span elements containing children or using CSS background-image.
  // <img> is a void element that cannot contain children and uses src attribute (not CSS).
  it('should not flag role="img" on containers with children or CSS background-image', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('prefer-tag-over-role - role img patterns', rule, {
      valid: [
        // Pattern 1a: role="img" with emoji text content
        // <img> is a void element that cannot contain children
        // role="img" with aria-label is the recommended accessibility pattern for emojis
        {
          code: `
            <span role="img" aria-label="computer">
              💻
            </span>
          `,
        },
        // Pattern 1b: role="img" with plain text content (initials)
        // Container displays text as visual representation of a person
        {
          code: `<span role="img" aria-label="John Doe">JD</span>`,
        },
        // Pattern 2: role="img" with icon component as child
        // <img> cannot contain children, so role="img" on a wrapper is correct
        {
          code: `
            <span role="img" aria-label="avatar" className="avatar-icon">
              {icon}
            </span>
          `,
        },
        // Pattern 3: role="img" with initials/text content
        // Container displays calculated text (initials), not an image file
        {
          code: `
            <span role="img" aria-label={name} className="avatar-initials">
              {getInitials(name)}
            </span>
          `,
        },
        // Pattern 4a: role="img" with CSS backgroundImage style (template literal)
        // <img> uses src attribute, not CSS background-image
        {
          code: `
            <div
              role="img"
              aria-label={alt}
              style={{ backgroundImage: \`url(\${url})\` }}
            />
          `,
        },
        // Pattern 4b: role="img" with CSS backgroundImage style (literal string)
        {
          code: `
            <div
              role="img"
              aria-label="cover image"
              style={{ backgroundImage: 'url(/images/cover.png)' }}
            />
          `,
        },
        // Pattern 5: role="img" wrapping a complex component
        // <img> is a void element that cannot contain children
        {
          code: `
            <div role="img" aria-label={title} className="pattern-slide">
              <BlockPreview blocks={blocks} minHeight={minHeight} />
            </div>
          `,
        },
        // Pattern 6: role="img" on div with fallback component
        // Container wraps fallback content for avatar/image component
        {
          code: `
            <div
              aria-label={ariaLabel}
              className="avatar-fallback"
              role="img"
            >
              {fallbackComponent}
            </div>
          `,
        },
      ],
      invalid: [
        // True positive: div with role="img" but no children and no backgroundImage
        // Should use <img> tag since it's not a container or styled element
        {
          code: `<div role="img" aria-label="picture" />`,
          errors: 1,
        },
        // True positive: span with role="img" but self-closing (no children)
        {
          code: `<span role="img" aria-label="icon" />`,
          errors: 1,
        },
      ],
    });
  });
});
