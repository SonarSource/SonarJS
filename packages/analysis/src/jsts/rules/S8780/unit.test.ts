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
import { rule } from './rule.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S8780', () => {
  it('S8780', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('Async test assertions should be awaited or returned', rule, {
      valid: [
        {
          code: `
            import { expect, it } from '@jest/globals';

            async function fetchUser(id) {
              return { id, name: 'Ada Lovelace' };
            }

            it('fetches user successfully', () => {
              return expect(fetchUser(1)).resolves.toHaveProperty('name');
            });

            it('rejects on invalid ID', async () => {
              await expect(fetchUser(-1)).rejects.toThrow('Invalid ID');
            });

            it('implicitly returns the promise', () =>
              expect(fetchUser(1)).resolves.not.toEqual(null));
          `,
        },
        {
          code: `
            import { expect as vitestExpect, it as vitestIt } from 'vitest';

            async function processData() {
              return [1, 2, 3];
            }

            vitestIt('processes data', () => {
              return vitestExpect(processData()).resolves.toEqual([1, 2, 3]);
            });

            vitestIt('handles errors', async () => {
              await vitestExpect(processData()).rejects.not.toThrow('Invalid ID');
            });
          `,
        },
        {
          code: `
            import { expectAsync } from 'jasmine';

            it('loads configuration', () => {
              return expectAsync(loadConfig()).toBeResolvedTo({ port: 3000 });
            });
          `,
        },
        {
          code: `
            import { test, expect as playwrightExpect } from '@playwright/test';

            test('displays welcome message', async ({ page }) => {
              await page.setContent('<h1>Welcome</h1>');
              await playwrightExpect(page.getByRole('heading')).toHaveText('Welcome');
            });
          `,
        },
        {
          code: `
            import { test, expect } from '@playwright/test';

            test('checks a value', async () => {
              expect(1).toBe(1);
              expect.soft(1).toBe(1);
              expect.poll(() => 1).toBe(1);
            });
          `,
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('keeps unsupported promise plumbing out of scope', () => {
              const assertion = expect(fetchUser(1)).resolves.toHaveProperty('name');
              Promise.all([expect(fetchUser(2)).resolves.toHaveProperty('id')]);
              return assertion;
            });
          `,
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('ignores nested callbacks and functions', () => {
              function assertLater() {
                expect(fetchUser(1)).resolves.toHaveProperty('name');
              }
              setTimeout(() => {
                expect(fetchUser(2)).resolves.toHaveProperty('id');
              });
              assertLater();
            });
          `,
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('does not flag synchronous assertions', () => {
              expect(user.name).toBe('Ada Lovelace');
            });
          `,
        },
      ],
      invalid: [
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('fetches user successfully', () => {
              expect(fetchUser(1)).resolves.toHaveProperty('name');
            });
          `,
          errors: [{ message: 'Await or return this async assertion.' }],
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('rejects on invalid ID', () => {
              expect(fetchUser(-1)).rejects.toThrow('Invalid ID');
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, test } from 'vitest';

            test('processes data', () => {
              expect(processData()).resolves.toEqual([1, 2, 3]);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, it } from 'vitest';

            it('waits for an async value', () => {
              expect(getValue())
                .resolves
                .toBe(1);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { expect as vitestExpect, it as vitestIt } from 'vitest';

            vitestIt('exports an invoice', () => {
              vitestExpect(exportInvoice('INV-2026-001')).resolves.toBeInstanceOf(Buffer);
            });
          `,
          errors: 1,
        },
        {
          code: `
            import * as vitest from 'vitest';

            vitest.test('waits for a namespaced expect call', () => {
              vitest.expect(fetchUser(1)).resolves.toHaveProperty('name');
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('supports not around async modifiers', () => {
              expect(fetchUser(1)).not.resolves.not.toEqual(null);
              expect(fetchUser(2)).rejects.not.toThrow('Invalid ID');
            });
          `,
          errors: 2,
        },
        {
          code: `
            import { expectAsync } from 'jasmine';

            it('loads configuration', () => {
              expectAsync(loadConfig()).toBeResolvedTo({ port: 3000 });
            });
          `,
          errors: 1,
        },
        {
          code: `
            import * as jasmine from 'jasmine';

            it('loads configuration', () => {
              jasmine.expectAsync(loadConfig()).toBeResolvedTo({ port: 3000 });
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { test, expect } from '@playwright/test';

            test('displays welcome message', async ({ page }) => {
              await page.setContent('<h1>Welcome</h1>');
              expect(page.getByRole('heading')).toHaveText('Welcome');
            });
          `,
          errors: [{ message: 'Await or return this async assertion.' }],
        },
        {
          code: `
            import { test as pwTest, expect as playwrightExpect } from '@playwright/test';

            pwTest('shows the account menu after login', async ({ page }) => {
              playwrightExpect(page.getByRole('button', { name: 'Account' })).toBeVisible();
            });
          `,
          errors: 1,
        },
        {
          code: `
            import * as playwright from '@playwright/test';

            playwright.test('shows the account menu after login', async ({ page }) => {
              playwright.expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
            });
          `,
          errors: 1,
        },
        {
          code: `
            import { test, expect } from '@playwright/test';

            test('checks accessibility assertions', async ({ page }) => {
              expect(page.getByRole('button')).toHaveRole('button');
              expect(page.getByRole('button')).toContainClass('primary');
              expect(page.getByRole('button')).toHaveAccessibleDescription('Submits the form');
              expect(page.getByRole('button')).toHaveAccessibleName('Submit');
              expect(page.getByRole('main')).toMatchAriaSnapshot();
            });
          `,
          errors: 5,
        },
        {
          code: `
            import { expect, it } from '@jest/globals';

            it('reports nested async assertions', () => {
              if (Math.random() > 0.5) {
                expect(fetchUser(1)).resolves.toHaveProperty('name');
              } else {
                for (const id of [1, 2, 3]) {
                  expect(fetchUser(id)).resolves.toHaveProperty('name');
                }
              }
              try {
                expect(fetchUser(2)).resolves.toHaveProperty('name');
              } finally {
                expect(fetchUser(3)).resolves.toHaveProperty('name');
              }
              switch (Math.random()) {
                case 0:
                  expect(fetchUser(4)).resolves.toHaveProperty('name');
                  break;
              }
            });
          `,
          errors: 5,
        },
      ],
    });
  });
});
