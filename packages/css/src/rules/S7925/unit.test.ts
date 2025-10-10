/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import { StylelintRuleTester } from '../../../tests/tools/tester/index.js';
import { rule, messages } from './rule.js';
import { describe, it } from 'node:test';

const ruleTester = new StylelintRuleTester(rule.ruleName);
describe('S7925', () => {
  it('should pass for line-height not using !important', () =>
    ruleTester.valid({
      code: `
        .good {
          line-height: 1em;
        }
      `,
    }));

  it('should pass for word-spacing not using !important', () =>
    ruleTester.valid({
      code: `
        .good {
          word-spacing: 1em;
        }
        `,
    }));

  it('should pass for letter-spacing not using !important', () =>
    ruleTester.valid({
      code: `
        .good {
          letter-spacing: 1em;
        }
        `,
    }));

  it('should fail when line-height use !important with small spacing', () =>
    ruleTester.invalid({
      code: `
        .bad {
          line-height: 1em !important;
        }
      `,
      errors: [{ text: `${messages['line-height']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when word-spacing use !important with small spacing', () =>
    ruleTester.invalid({
      code: `
        .bad {
          word-spacing: 0.11em !important;
        }
      `,
      errors: [{ text: `${messages['word-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when letter-spacing use !important with small spacing', () =>
    ruleTester.invalid({
      code: `
        .bad {
          letter-spacing: 0.1em !important;
        }
      `,
      errors: [{ text: `${messages['letter-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  // Tests with different units - VALID cases (above threshold)
  it('should pass for word-spacing with rem unit above threshold without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          word-spacing: 0.2rem;
        }
      `,
    }));

  it('should pass for letter-spacing with ex unit above threshold without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          letter-spacing: 0.3ex;
        }
      `,
    }));

  it('should pass for line-height with ch unit above threshold without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          line-height: 4ch;
        }
      `,
    }));

  it('should pass for word-spacing with percentage above threshold without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          word-spacing: 20%;
        }
      `,
    }));

  it('should pass for letter-spacing with cap unit above threshold without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          letter-spacing: 0.2cap;
        }
      `,
    }));

  it('should pass for line-height with ic unit above threshold without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          line-height: 1.6ic;
        }
      `,
    }));

  // Tests with different units - VALID cases (above threshold WITH !important)
  it('should pass for word-spacing with rem unit above threshold with !important', () =>
    ruleTester.valid({
      code: `
        .good {
          word-spacing: 0.2rem !important;
        }
      `,
    }));

  it('should pass for letter-spacing with rex unit above threshold with !important', () =>
    ruleTester.valid({
      code: `
        .good {
          letter-spacing: 0.3rex !important;
        }
      `,
    }));

  it('should pass for line-height with rch unit above threshold with !important', () =>
    ruleTester.valid({
      code: `
        .good {
          line-height: 4rch !important;
        }
      `,
    }));

  it('should pass for word-spacing with percentage above threshold with !important', () =>
    ruleTester.valid({
      code: `
        .good {
          word-spacing: 20% !important;
        }
      `,
    }));

  it('should pass for letter-spacing with rcap unit above threshold with !important', () =>
    ruleTester.valid({
      code: `
        .good {
          letter-spacing: 0.2rcap !important;
        }
      `,
    }));

  // Tests with different units - INVALID cases (below threshold WITH !important)
  it('should fail when word-spacing with rem unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          word-spacing: 0.1rem !important;
        }
      `,
      errors: [{ text: `${messages['word-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when letter-spacing with ex unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          letter-spacing: 0.2ex !important;
        }
      `,
      errors: [{ text: `${messages['letter-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when line-height with ch unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          line-height: 2ch !important;
        }
      `,
      errors: [{ text: `${messages['line-height']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when word-spacing with percentage below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          word-spacing: 10% !important;
        }
      `,
      errors: [{ text: `${messages['word-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when letter-spacing with cap unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          letter-spacing: 0.15cap !important;
        }
      `,
      errors: [{ text: `${messages['letter-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when line-height with ic unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          line-height: 1.2ic !important;
        }
      `,
      errors: [{ text: `${messages['line-height']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when word-spacing with rex unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          word-spacing: 0.3rex !important;
        }
      `,
      errors: [{ text: `${messages['word-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when letter-spacing with rch unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          letter-spacing: 0.2rch !important;
        }
      `,
      errors: [{ text: `${messages['letter-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when line-height with rcap unit below threshold uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          line-height: 2rcap !important;
        }
      `,
      errors: [{ text: `${messages['line-height']} (sonar/text-spacing)`, line: 3 }],
    }));

  // Tests with negative values
  it('should fail when word-spacing with negative value uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          word-spacing: -0.1em !important;
        }
      `,
      errors: [{ text: `${messages['word-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should pass for word-spacing with negative value without !important', () =>
    ruleTester.valid({
      code: `
        .good {
          word-spacing: -0.1em;
        }
      `,
    }));

  // Tests with decimal values
  it('should fail when letter-spacing with small decimal value uses !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          letter-spacing: 0.05em !important;
        }
      `,
      errors: [{ text: `${messages['letter-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should pass for letter-spacing with larger decimal value with !important', () =>
    ruleTester.valid({
      code: `
        .good {
          letter-spacing: 0.15em !important;
        }
      `,
    }));

  // Tests with unsupported properties (should be ignored)
  it('should pass for margin with !important (unsupported property)', () =>
    ruleTester.valid({
      code: `
        .good {
          margin: 0.1em !important;
        }
      `,
    }));

  it('should pass for font-size with !important (unsupported property)', () =>
    ruleTester.valid({
      code: `
        .good {
          font-size: 0.1em !important;
        }
      `,
    }));

  it('should pass for padding with !important (unsupported property)', () =>
    ruleTester.valid({
      code: `
        .good {
          padding: 0.1em !important;
        }
      `,
    }));

  // Edge case: unitless values
  it('should pass when line-height with unitless value below threshold uses !important', () =>
    ruleTester.valid({
      code: `
        .good {
          line-height: 1.2 !important;
        }
      `,
    }));
});
