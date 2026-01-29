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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S5850', () => {
  it('S5850', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Anchor precedence', rule, {
      valid: [
        {
          code: `/^(?:a|b|c)$/`,
        },
        {
          code: `/(?:^a)|b|(?:c$)/`,
        },
        {
          code: `/^abc$/`,
        },
        {
          code: `/a|b|c/`,
        },
        {
          code: `/^a$|^b$|^c$/`,
        },
        {
          code: `/^a$|b|c/`,
        },
        {
          code: `/a|b|^c$/`,
        },
        {
          code: `/^a|^b$|c$/`,
        },
        {
          code: `/^a|^b|c$/`,
        },
        {
          code: `/^a|b$|c$/`,
        },
        {
          code: `/^a|^b|c/`, // More likely intential as there are multiple anchored alternatives
        },
        {
          code: `/aa|bb|cc/`,
        },
        {
          code: `/^/`,
        },
        {
          code: `/^[abc]$/`,
        },
        {
          code: `/|/`,
        },
        // Complementary anchor patterns (two alternatives: ^first|second$)
        // These are valid trimming idioms that should NOT be flagged
        {
          // Whitespace trimming - standard idiom
          code: `/^\\s+|\\s+$/g`,
        },
        {
          // Hyphen trimming - slug normalization
          code: `/^-+|-+$/g`,
        },
        {
          // Quote removal - unquoting strings
          code: `/^['"]|['"]$/g`,
        },
        {
          // Underscore trimming - identifier normalization
          code: `/^_+|_+$/g`,
        },
        {
          // Slash trimming - path normalization
          code: `/^\\/|\\/$/g`,
        },
        {
          // Multiple slashes - path normalization
          code: `/^\\/+|\\/+$/g`,
        },
        {
          // Double quote trimming
          code: `/^"|"$/g`,
        },
        {
          // Brace trimming
          code: `/^\\{|\\}$/g`,
        },
        {
          // Single space trimming
          code: `/^ | $/g`,
        },
        {
          // Whitespace with character class
          code: `/^[\\s]+|[\\s]+$/g`,
        },
        {
          // Whitespace with non-breaking space
          code: `/^[\\s\\xA0]+|[\\s\\xA0]+$/g`,
        },
        // Asymmetric complementary anchor patterns (different start/end patterns)
        {
          // Protocol stripping at start, extension at end
          code: `/^http:\\/\\/|\\.html$/`,
        },
        {
          // Asymmetric quote cleanup - single at start, double at end
          code: `/^'|"+$/`,
        },
        {
          // BOM at start, null at end
          code: `/^\\uFEFF|\\0$/`,
        },
        {
          // Currency formatting - $ symbol at start, USD at end
          code: `/^\\$|USD$/`,
        },
        {
          // Validation patterns - digits at start OR keyword at end
          code: `/^\\d+|me$/`,
        },
        {
          // Validation patterns - digits at start OR 'all' at end
          code: `/^\\d+|all$/`,
        },
        {
          // Mixed boundary markers - hash/slash at start, whitespace at end
          code: `/^[#\\/]|\\s+$/g`,
        },
        {
          // Attribute test - 'off' at start, 'false' at end
          code: `/^off|false$/`,
        },
        // Additional patterns from ruling analysis
        {
          // Table block matching - empty/whitespace at start OR equals at end
          code: `/^\\s*|={3,}\\s*$/`,
        },
        {
          // Whitespace trimming with optional stars
          code: `/^\\s*|\\s*$/g`,
        },
        {
          // Git ref parsing - SHA at start OR ref: at end
          code: `/^([a-f0-9]{40})|(?:ref: (refs\\/.*))$/m`,
        },
        {
          // Double caret (redundant but valid) - tag at start OR close at end
          code: `/^^<\\/?[a-z](?:[\\w.:-]*\\w)?|\\/?>$/i`,
        },
        {
          // Complex rtrim with capturing group - whitespace or escaped chars
          code: `new RegExp("^" + whitespace + "+|((?:^|[^\\\\\\\\])(?:\\\\\\\\.)*)" + whitespace + "+$", "g")`,
        },
      ],
      invalid: [
        {
          code: `/^a|b|c$/`,
          errors: [
            {
              message:
                'Group parts of the regex together to make the intended operator precedence explicit.',
              line: 1,
              endLine: 1,
              column: 2,
              endColumn: 9,
            },
          ],
        },
        {
          code: `/^a|b|cd/`,
          errors: 1,
        },
        {
          code: `/a|b|c$/`,
          errors: 1,
        },
        {
          code: `/^a|(b|c)/`,
          errors: 1,
        },
        {
          code: `/(a|b)|c$/`,
          errors: 1,
        },
        // Two alternatives but NOT complementary anchors - should still be flagged
        {
          // Only start anchor, no end anchor on second alternative
          code: `/^a|b/`,
          errors: 1,
        },
        {
          // Only end anchor, no start anchor on first alternative
          code: `/a|b$/`,
          errors: 1,
        },
        // Additional invalid patterns from ruling analysis
        {
          // 3 alternatives with middle unanchored - user status check
          code: `/^active|warn-[1-4]|locked$/`,
          errors: 1,
        },
        {
          // 3 alternatives with middle unanchored - path exclusion
          code: `/^index|examples\\/|ptore2e\\//`,
          errors: 1,
        },
        {
          // Line matching with 3 effective alternatives
          code: `/.+(?:\\r\\n?|\\n)|.*$/g`,
          errors: 1,
        },
        {
          // Mouse event pattern - click not anchored
          code: `/^(?:mouse|pointer|contextmenu|drag|drop)|click/`,
          errors: 1,
        },
        {
          // Multiple patterns with only last anchored
          code: `/\\s\\S| \\t|\\t |\\s$/`,
          errors: 1,
        },
      ],
    });
  });
});
