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
import { getESLintCoreRule } from '../external/core.js';
import { describe, it } from 'node:test';

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S1143 upstream sentinel', () => {
  it('upstream no-unsafe-finally raises on guard clause patterns that decorator suppresses', () => {
    const ruleTester = new DefaultParserRuleTester();
    const upstreamRule = getESLintCoreRule('no-unsafe-finally');

    ruleTester.run('upstream no-unsafe-finally raises on fixed patterns', upstreamRule, {
      valid: [],
      invalid: [
        {
          // optional chaining condition — suppressed by decorator, raised by upstream
          code: `
async function closePopover() {
  try {
    await validateForm();
  } finally {
    const errors = getFormErrors();
    if (errors?.length) return;
    setVisible(false);
  }
}
          `,
          errors: 1,
        },
        {
          // negated flag condition — suppressed by decorator, raised by upstream
          code: `
async function fetchData() {
  let isActive = true;
  try {
    const data = await fetch('/api/data');
    processData(data);
  } finally {
    if (!isActive) {
      return;
    }
    setLoading(false);
  }
}
          `,
          errors: 1,
        },
        {
          // member expression condition — suppressed by decorator, raised by upstream
          code: `
async function asyncOperation() {
  const state = { cancelled: false };
  try {
    await doWork();
  } finally {
    if (state.cancelled) return;
    performCleanup();
  }
}
          `,
          errors: 1,
        },
        {
          // call expression condition — suppressed by decorator, raised by upstream
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
      ],
    });
  });
});

describe('S1143', () => {
  it('S1143', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Jump statements should not occur in "finally" blocks', rule, {
      valid: [
        {
          // guard clause with identifier condition
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
          // guard clause with block syntax
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
          // guard clause followed by multiple statements
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
          // guard clause with optional chaining condition
          code: `
async function closePopover() {
  try {
    await validateForm();
  } finally {
    const errors = getFormErrors();
    if (errors?.length) return;
    setVisible(false);
  }
}
          `,
        },
        {
          // guard clause with negated flag condition
          code: `
async function fetchData() {
  let isActive = true;
  try {
    const data = await fetch('/api/data');
    processData(data);
  } finally {
    if (!isActive) {
      return;
    }
    setLoading(false);
  }
}
          `,
        },
        {
          // guard clause with member expression condition
          code: `
async function asyncOperation() {
  const state = { cancelled: false };
  try {
    await doWork();
  } finally {
    if (state.cancelled) return;
    performCleanup();
  }
}
          `,
        },
        {
          // guard clause with call expression condition
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
        },
        {
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
          // unconditional return in finally block
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
          // return with value in finally block overrides the return value
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
          // guard return not followed by statements
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
          // break in finally block
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
          // continue in finally block
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
          // throw in finally block
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
