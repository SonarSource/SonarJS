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

  it('should fail when line-height use !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          line-height: 1em !important;
        }
      `,
      errors: [{ text: `${messages['line-height']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when word-spacing use !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          word-spacing: 1em !important;
        }
      `,
      errors: [{ text: `${messages['word-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));

  it('should fail when letter-spacing use !important', () =>
    ruleTester.invalid({
      code: `
        .bad {
          letter-spacing: 1em !important;
        }
      `,
      errors: [{ text: `${messages['letter-spacing']} (sonar/text-spacing)`, line: 3 }],
    }));
});
