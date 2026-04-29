/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S7722 upstream sentinel', () => {
  it('upstream error-message raises on stack-trace capture patterns that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('error-message', rules['error-message'], {
      valid: [],
      invalid: [
        { code: `new Error().stack;`, errors: 1 }, // direct .stack read — suppressed by decorator, raised by upstream
        { code: `new Error()['stack'];`, errors: 1 }, // computed .stack read — suppressed by decorator, raised by upstream
        { code: `const err = new Error(); log(err.stack);`, errors: 1 }, // variable used only for .stack — suppressed by decorator, raised by upstream
      ],
    });
  });
});

describe('S7722', () => {
  it('S7722', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Built-in error objects should have meaningful messages', rule, {
      valid: [
        { code: `throw new Error('Something went wrong');` },
        { code: `new Error().stack;` }, // Pattern 1: direct .stack read
        { code: `new Error()['stack'];` }, // Pattern 1: computed .stack read
        { code: `logger.debug('call site:', new Error().stack);` }, // Pattern 1: inline in sync call
        { code: `await logger.debug('call site:', new Error().stack);` }, // Pattern 1: inline in async call
        { code: `const stack = new Error().stack;` }, // Pattern 1: .stack stored in variable
        { code: `const err = new Error(); log(err.stack);` }, // Pattern 2: variable, only .stack reads
        { code: `const err = new Error(); log(err['stack']);` }, // Pattern 2: computed .stack read
        { code: `const err = new Error(); await logger.debug(err.stack);` }, // Pattern 2: async call
        {
          // Pattern 2: real-world hookLog pattern
          code: `
const stackError = new Error();
hookLog.push({ primitive: hookName, stack: stackError.stack, value: value });
          `,
        },
      ],
      invalid: [
        {
          code: `throw new Error();`,
          errors: 1,
        },
        {
          code: `new Error().stack = 'custom';`, // write target — not stack capture
          errors: 1,
        },
        {
          code: `delete new Error().stack;`, // delete — not a read
          errors: 1,
        },
        {
          code: `new Error().stack++;`, // update expression — not a read
          errors: 1,
        },
        {
          code: `const err = new Error(); console.log(err.message);`, // non-stack member access
          errors: 1,
        },
        {
          code: `const err = new Error(); err.name = 'Trace'; console.log(err.stack);`, // non-stack interaction
          errors: 1,
        },
        {
          code: `const err = new Error(); delete err.stack;`, // delete on variable — not a read
          errors: 1,
        },
        {
          code: `const err = new Error(); someFunc(err);`, // variable passed as argument — not provably stack-only
          errors: 1,
        },
        {
          code: `const err = new Error(); err.stack++;`, // update on variable — not a read
          errors: 1,
        },
        {
          code: `let err = new Error(); err = other; console.log(err.stack);`, // reassignment — original error not used for .stack
          errors: 1,
        },
        {
          code: `var err = new Error(); var err = other; console.log(err.stack);`, // redeclaration — original error not used for .stack
          errors: 1,
        },
        {
          code: `const hasStack = Boolean(new Error().stack);`, // .stack used as boolean — not stack capture
          errors: 1,
        },
        {
          code: `if (new Error().stack) { doSomething(); }`, // .stack used as condition — not stack capture
          errors: 1,
        },
        {
          code: `const stackLength = new Error().stack.length;`, // .stack used to access property — not stack capture
          errors: 1,
        },
      ],
    });
  });
});
