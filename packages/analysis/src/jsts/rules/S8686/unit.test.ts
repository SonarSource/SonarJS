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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S8686', () => {
  it('S8686', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Assertions should not be conditional', rule, {
      valid: [
        {
          code: `
import { expect, it } from '@jest/globals';

it('rejects duplicate emails', async () => {
  await expect(register(user)).rejects.toThrow('Email already exists');
});
`,
        },
        {
          code: `
import { expect, test } from '@playwright/test';

test('shows an error after a failed login', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign in' }).click();

  const error = page.getByRole('alert');
  await expect(error).toBeVisible();
  await expect(error).toHaveText('Invalid credentials');
});
`,
          filename: 'login.spec.ts',
        },
        {
          code: `
import { expect, test } from 'vitest';

test('stores the result', () => {
  const result = save();

  if (result.needsRefresh) {
    refreshCache();
  }

  expect(result.ok).toBe(true);
});
`,
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('asserts before handling cleanup failure', () => {
  try {
    expect(readConfig()).toEqual({ enabled: true });
  } catch (error) {
    log(error);
  }
});
`,
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('asserts during cleanup', () => {
  try {
    run();
  } finally {
    expect(cleanupDone).toBe(true);
  }
});
`,
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks resolved data', async () => {
  await loadData().then(data => {
    expect(data.ready).toBe(true);
  });
});
`,
        },
        {
          code: `
import { expect, test } from '@jest/globals';

function helper(value) {
  if (value.ready) {
    expect(value.status).toBe('ready');
  }
}
`,
        },
        {
          code: `
it('does not run in files without a supported framework', () => {
  if (ready) {
    expect(result).toBe('done');
  }
});
`,
        },
        {
          code: `
import { test } from '@playwright/test';
import assert from 'node:assert';

test('uses another assertion API', () => {
  if (ready) {
    assert.ok(result);
  }
});
`,
        },
      ],
      invalid: [
        {
          code: `
import { expect, test } from 'vitest';

test('checks an expected rejection with assertion count', async () => {
  expect.assertions(1);

  await run().catch(error => {
    expect(error.message).toBe('failed');
  });
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('uses a catch callback as a failure sentinel after successful assertions', () => {
  return loadData()
    .then(() => {
      expect(store.getActions()).toMatchSnapshot();
    })
    .catch(() => {
      expect(false).toBe(true);
    });
});
`,
          errors: [{ messageId: 'conditionalAssertion', line: 10, column: 7 }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('checks expected failure details with an explicit flag assertion', async () => {
  let errorRaised = false;

  try {
    await checkoutBranch('..');
  } catch (error) {
    errorRaised = true;
    expect(error.message).toBe('fatal: invalid reference: ..');
  }

  expect(errorRaised).toBe(true);
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('checks expected failure details with a post-catch sentinel', async () => {
  let result = null;

  try {
    result = await cherryPick(repository, commits);
  } catch (error) {
    expect(error.toString()).toContain('untracked working tree files');
  }

  expect(result).toBe(null);
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks expected DOMException details', () => {
  try {
    new FormData(form, submitter);
  } catch (error) {
    const expectedError = new DOMException('bad submitter', 'NotFoundError');
    expect(error).toEqual(expectedError);
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('checks required settings', () => {
  expect(config.loaded).toBe(true);

  if (config.enabled) {
    expect(config.mode).toBe('strict');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion', line: 8, column: 5 }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('rejects duplicate emails', async () => {
  await register(user).catch((error) => {
    expect(error.message).toBe('Email already exists');
  });
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('handles rejected dispatches', () => {
  return store.dispatch(action)
    .then(() => {
      expect(state.ready).toBe(true);
    })
    .catch(error => {
      expect(error.message).toBe('failed');
    });
});
`,
          errors: [{ messageId: 'conditionalAssertion', line: 10, column: 7 }],
        },
        {
          code: `
import { expect, test } from '@playwright/test';

test('shows an error after a failed login', async ({ page }) => {
  const error = page.getByRole('alert');

  if (await error.isVisible()) {
    await expect(error).toHaveText('Invalid credentials');
  }
});
`,
          filename: 'login.spec.ts',
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks the review step', async () => {
  await loadStep().then(step => {
    if (step === 'Review') {
      expect(step).toBe('Review');
    }
  });
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'bun:test';

test('checks every state', () => {
  switch (state) {
    case 'ready':
      expect(value).toBe(1);
      break;
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('uses a ternary assertion', () => {
  ready ? expect(result).toBe('done') : update(result);
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('uses a logical assertion', () => {
  ready && expect(result).toBe('done');
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('asserts only when work fails', () => {
  try {
    doWork();
  } catch (error) {
    expect(error).toBeDefined();
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks values only when ready', () => {
  if (ready) {
    values.forEach(value => expect(value).toBe(1));
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expectObservable, test } from 'vitest';

test('checks marble output conditionally', () => {
  if (ready) {
    expectObservable(stream).toBe('(a|)');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('checks both branches', () => {
  if (enabled) {
    expect(status).toBe('enabled');
  } else {
    expect(status).toBe('disabled');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }, { messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks expected errors from APIs that cannot use toThrow', async () => {
  try {
    await vi.waitFor(check, 100);
  } catch (error) {
    expect(error.message).toMatchInlineSnapshot('"Fail."');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test, vi } from 'vitest';

test('checks expected error details with multiple assertions', async () => {
  try {
    await vi.waitFor(check, 100);
  } catch (error) {
    expect(error.message).toMatchInlineSnapshot('"Fail."');
    expect(error.stack).toMatch(/at check/);
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }, { messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('checks platform-specific output', () => {
  if (process.platform === 'win32') {
    expect(message).toContain('exited with code 1');
  } else {
    expect(message).toContain('ENOENT');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }, { messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks entries for each generated trace file', async () => {
  for (const traceFile of traceFiles) {
    const events = await readEvents(traceFile);

    if (traceFile.includes('locator-mark')) {
      expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ title: 'mark' })]));
    }
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from '@jest/globals';

it('checks line numbers by diff line variant', () => {
  for (const line of firstHunk.lines) {
    if (line.type === DiffLineType.Add) {
      expect(line.newLineNumber).toBe(expectedNewLine);
    } else if (line.type === DiffLineType.Delete) {
      expect(line.oldLineNumber).toBe(expectedOldLine);
    }
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }, { messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

const IS_PLAYWRIGHT = process.env.PROVIDER === 'playwright';

test('checks provider-specific benchmark output', () => {
  if (IS_PLAYWRIGHT) {
    expect(result.stdout).toContain('|chromium| basic.bench.ts');
  } else {
    expect(result.stdout).toContain('|chrome| basic.bench.ts');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }, { messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks version-specific transformed source', () => {
  if (viteVersion[0] >= '6') {
    expect(result.scriptSource).toContain('test)("sum", () => {');
  } else {
    expect(result.scriptSource).toContain('test("sum", () => {');
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }, { messageId: 'conditionalAssertion' }],
        },
        {
          code: `
import { expect, it } from 'vitest';

it('checks inherited values for each project', ({ task }) => {
  const project = task.file.projectName;
  switch (project) {
    case 'project-1':
      expect(process.env.TEST_ROOT).toBe('1');
      return;
    default:
      expect.unreachable();
  }
});
`,
          errors: [{ messageId: 'conditionalAssertion' }],
        },
      ],
    });
  });
});
