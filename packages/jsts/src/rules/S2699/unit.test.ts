/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

describe('S2699', () => {
  it('S2699', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run(`Test cases must have assertions`, rule, {
      valid: [
        {
          code: `
const chai = require('chai');
const { expect } = chai;
describe('chai test cases', () => {
  it('expect', () => {
    expect(1).to.equal(2);
  });
  it('should go into function', () => {
    funcWithExpect();
  });
  it('repeated function calls should work', () => {
    funcWithExpect();
  });
});

function funcWithExpect() {
  expect(1).to.equal(2);
}
          `,
        },
        {
          code: `
const chai = require('chai');
describe('global expect', () => {
  it('expect', () => {
    expect(5).toEqual(4);
  });
});
          `,
        },
        {
          code: `
describe('no import from test library', () => {
  it('should not fail', () => {
    // no-op
  });
});
`,
        },
      ],
      invalid: [
        {
          code: `
const chai = require('chai');
describe('chai test cases', () => {
  it('no assertion', () => {
    const x = 1 + 2;
  });
});`,
          errors: 1,
        },
      ],
    });
  });
});
