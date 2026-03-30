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
import { rules } from '../external/unicorn.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

const upstreamRule = rules['prefer-structured-clone'];

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S7784 upstream sentinel', () => {
  it('upstream prefer-structured-clone raises on JSON.stringify-nested patterns that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('prefer-structured-clone', upstreamRule, {
      valid: [],
      invalid: [
        // direct argument to JSON.stringify() — suppressed by decorator, raised by upstream
        { code: `const s = JSON.stringify(JSON.parse(JSON.stringify(data)));`, errors: 1 },
        // nested in object literal inside JSON.stringify() — suppressed by decorator, raised by upstream
        {
          code: `const s = JSON.stringify({ items: JSON.parse(JSON.stringify(self.items)) });`,
          errors: 1,
        },
        // nested in array literal inside JSON.stringify() — suppressed by decorator, raised by upstream
        { code: `const s = JSON.stringify([JSON.parse(JSON.stringify(items[0]))]);`, errors: 1 },
        // spread inside JSON.stringify() — suppressed by decorator, raised by upstream
        { code: `const s = JSON.stringify({ ...JSON.parse(JSON.stringify(config)) });`, errors: 1 },
        // computed property key, value position inside JSON.stringify() — suppressed by decorator, raised by upstream
        {
          code: `const s = JSON.stringify({ [key]: JSON.parse(JSON.stringify(model)) });`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7784', () => {
  it('S7784', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('prefer-structured-clone', rule, {
      valid: [
        {
          // direct argument to JSON.stringify(): serialization normalization, not deep clone
          code: `const s = JSON.stringify(JSON.parse(JSON.stringify(data)));`,
        },
        {
          // nested in object literal inside JSON.stringify() for API request body
          code: `
fetch('/api/save', {
  method: 'POST',
  body: JSON.stringify({
    items: JSON.parse(JSON.stringify(self.items)),
    blocks: JSON.parse(JSON.stringify(self.blocks)),
  }),
});
          `,
        },
        {
          // nested in array literal inside JSON.stringify()
          code: `const s = JSON.stringify([JSON.parse(JSON.stringify(items[0]))]);`,
        },
        {
          // spread inside JSON.stringify()
          code: `const s = JSON.stringify({ ...JSON.parse(JSON.stringify(config)) });`,
        },
        {
          // computed property key, value position inside JSON.stringify()
          code: `const s = JSON.stringify({ [key]: JSON.parse(JSON.stringify(model)) });`,
        },
      ],
      invalid: [
        {
          // genuine deep clone: not inside JSON.stringify()
          code: `const clone = JSON.parse(JSON.stringify(original));`,
          errors: 1,
        },
        {
          // deep clone in object literal not passed to JSON.stringify()
          code: `const obj = { copy: JSON.parse(JSON.stringify(state)) };`,
          errors: 1,
        },
      ],
    });
  });
});
