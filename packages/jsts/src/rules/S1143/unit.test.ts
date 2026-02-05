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

describe('S1143', () => {
  it('S1143', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Jump statements should not occur in "finally" blocks', rule, {
      valid: [
        {
          // Guard return with cancellation flag in finally block - React async effect cleanup pattern
          // This should NOT raise an issue because: the return is conditional on a boolean flag,
          // followed by code that performs side effects, and doesn't suppress exceptions
          code: `
async function asyncOperation() {
  let cancelled = false;
  try {
    await doWork();
  } catch (e) {
    handleError(e);
  } finally {
    if (cancelled) return;
    performCleanup();
  }
}
          `,
        },
        {
          // Guard return with block syntax: if (flag) { return; }
          code: `
async function asyncOperation() {
  let stopped = false;
  try {
    await doSomeWork();
  } catch (err) {
    handleError(err);
  } finally {
    if (stopped) {
      return;
    }
    performCleanup();
  }
}
          `,
        },
        {
          // Guard return followed by multiple statements
          code: `
async function asyncOperation() {
  let cancelled = false;
  try {
    await doWork();
  } finally {
    if (cancelled) return;
    cleanup1();
    cleanup2();
  }
}
          `,
        },
        {
          // No finally block - should not trigger rule
          code: `
function foo() {
  try {
    doWork();
  } catch (e) {
    return;
  }
}
          `,
        },
      ],
      invalid: [
        {
          // Unconditional return in finally block - should be flagged
          code: `
function foo() {
  try {
    doWork();
  } finally {
    return;
  }
}
          `,
          errors: 1,
        },
        {
          // Return with value in finally block - should be flagged even if conditional
          // because it overrides the return value
          code: `
function foo() {
  let cancelled = false;
  try {
    doWork();
    return 42;
  } finally {
    if (cancelled) return 0;
    cleanup();
  }
}
          `,
          errors: 1,
        },
        {
          // Guard return NOT followed by statements - should be flagged
          // because it's effectively the same as unconditional return at end of finally
          code: `
function foo() {
  let cancelled = false;
  try {
    doWork();
  } finally {
    if (cancelled) return;
  }
}
          `,
          errors: 1,
        },
        {
          // Return with non-identifier condition - should be flagged
          // The condition is a call expression, not a simple identifier
          code: `
function foo() {
  try {
    doWork();
  } finally {
    if (isCancelled()) return;
    cleanup();
  }
}
          `,
          errors: 1,
        },
        {
          // Break in finally block - should be flagged
          code: `
function foo() {
  while (true) {
    try {
      doWork();
    } finally {
      break;
    }
  }
}
          `,
          errors: 1,
        },
        {
          // Continue in finally block - should be flagged
          code: `
function foo() {
  while (true) {
    try {
      doWork();
    } finally {
      continue;
    }
  }
}
          `,
          errors: 1,
        },
        {
          // Throw in finally block - should be flagged
          code: `
function foo() {
  try {
    doWork();
  } finally {
    throw new Error('error');
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
