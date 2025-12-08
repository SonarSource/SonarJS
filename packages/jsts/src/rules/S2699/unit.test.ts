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
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S2699', () => {
  it('S2699', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(`Test cases must have assertions`, rule, {
      valid: [
        {
          code: `
import { expect } from 'vitest';
describe('vitest test cases', () => {
  it("And we should NOT get contexts[2]", () => {
    expect(result).not.toContain(contexts[2]);
  });
});
`,
        },
      ],
      invalid: [],
    });
    const noTypescriptRuleTester = new DefaultParserRuleTester();
    noTypescriptRuleTester.run(`Test cases must have assertions`, rule, {
      valid: [
        {
          code: `
import { expect } from 'vitest';
describe('vitest test cases', () => {
  it("And we should NOT get contexts[2]", () => {
    expect(result).not.toContain(contexts[2]);
  });
});
`,
        },
      ],
      invalid: [],
    });
  });
});
