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
        },
        {
          code: `
import { expect, test } from 'vitest';

test('checks an expected failure', async () => {
  expect.assertions(1);

  await fails().catch(error => {
    expect(error.message).toBe('failed');
  });
});
`,
        },
        {
          code: `
import { expect, test } from 'vitest';

test('uses platform-specific expectations', () => {
  if (process.platform === 'win32') {
    expect(message).toContain('exited with code 1');
  } else {
    expect(message).toContain('ENOENT');
  }
});
`,
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
        },
      ],
      invalid: [
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
      ],
    });
  });
});
