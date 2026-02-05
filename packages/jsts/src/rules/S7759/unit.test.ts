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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7759', () => {
  it('S7759', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Date.now() should be used to get the number of milliseconds', rule, {
      valid: [
        // Pattern 1: Logical OR with Date.now - new Date().getTime() in fallback
        // False positive scenario: using getTime() as a polyfill fallback for Date.now()
        {
          code: `var getTime = Date.now || function() { return new Date().getTime(); };`,
        },
        {
          code: `let getTime = Date.now || function() { return new Date().getTime(); };`,
        },
        // With parentheses around the expression
        {
          code: `let getTime = (Date.now || function() { return new Date().getTime(); });`,
        },

        // Pattern 2: Ternary with Date.now check - fallback in alternate
        // False positive scenario: using unary plus or getTime() in ternary fallback
        {
          code: `var now = function() { return Date.now ? Date.now() : +(new Date()); };`,
        },
        {
          code: `var now = function() { return Date.now ? Date.now() : new Date().getTime(); };`,
        },
        {
          code: `export var now = function() { return Date.now ? Date.now() : +new Date(); };`,
        },

        // Pattern 3: IfStatement with !Date.now and assignment to Date.now
        // False positive scenario: polyfill that assigns to Date.now when it doesn't exist
        {
          code: `if (!Date.now) { Date.now = function() { return new Date().getTime(); }; }`,
        },
        {
          code: `if (!Date.now) { Date.now = function now() { return new Date().getTime(); }; }`,
        },

        // Nested polyfill patterns
        {
          code: `var getTime = Date.now || (function() { return function() { return new Date().getTime(); }; })();`,
        },

        // Direct Date.now() usage is already compliant
        {
          code: `var timestamp = Date.now();`,
        },
      ],
      invalid: [
        // Direct usage without polyfill pattern should still report
        {
          code: `var timestamp = new Date().getTime();`,
          output: `var timestamp = Date.now();`,
          errors: [{ messageId: 'prefer-date-now-over-methods' }],
        },
        {
          code: `var timestamp = +(new Date());`,
          output: `var timestamp = Date.now();`,
          errors: [{ messageId: 'prefer-date' }],
        },
        {
          code: `var timestamp = Number(new Date());`,
          output: `var timestamp = Date.now();`,
          errors: [{ messageId: 'prefer-date-now-over-number-data-object' }],
        },
        // If statement without Date.now assignment should still report
        {
          code: `if (!Date.now) { var x = new Date().getTime(); }`,
          output: `if (!Date.now) { var x = Date.now(); }`,
          errors: [{ messageId: 'prefer-date-now-over-methods' }],
        },
        // Code in else branch is not a polyfill fallback
        {
          code: `if (!Date.now) { Date.now = function() { return 0; }; } else { var x = new Date().getTime(); }`,
          output: `if (!Date.now) { Date.now = function() { return 0; }; } else { var x = Date.now(); }`,
          errors: [{ messageId: 'prefer-date-now-over-methods' }],
        },
        // Logical OR with wrong left operand (not Date.now)
        {
          code: `var getTime = someOther || function() { return new Date().getTime(); };`,
          output: `var getTime = someOther || function() { return Date.now(); };`,
          errors: [{ messageId: 'prefer-date-now-over-methods' }],
        },
        // Ternary with wrong condition (not Date.now)
        {
          code: `var now = function() { return someCondition ? Date.now() : new Date().getTime(); };`,
          output: `var now = function() { return someCondition ? Date.now() : Date.now(); };`,
          errors: [{ messageId: 'prefer-date-now-over-methods' }],
        },
      ],
    });
  });
});
