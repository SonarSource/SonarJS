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
import path from 'node:path';

const MESSAGE = 'Replace these 3 tests with a single Parameterized one.';
const MESSAGE_4 = 'Replace these 4 tests with a single Parameterized one.';
const SONAR_RUNTIME_MESSAGE = JSON.stringify({
  message: MESSAGE,
  secondaryLocations: [
    { message: 'Value to parameterize', column: 27, line: 3, endColumn: 30, endLine: 3 },
    { message: 'Related test', column: 5, line: 8, endColumn: 30, endLine: 8 },
    { message: 'Related test', column: 5, line: 14, endColumn: 30, endLine: 14 },
  ],
});

describe('S5976', () => {
  it('S5976', () => {
    const ruleTester = new DefaultParserRuleTester();
    const fixtures = path.join(import.meta.dirname, 'fixtures');
    const jestTestFile = path.join(fixtures, 'jest', 'test.js');
    const noFrameworkTestFile = path.join(fixtures, 'no-framework', 'test.js');
    const playwrightTestFile = path.join(fixtures, 'playwright', 'test.ts');
    const vitestTestFile = path.join(fixtures, 'vitest', 'test.ts');

    ruleTester.run('Similar tests should be grouped in a single Parameterized test', rule, {
      valid: [
        {
          code: `
test('normalizes a 200 status', () => {
  const status = normalize(200);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes a 201 status', () => {
  const status = normalize(201);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});
          `,
          filename: jestTestFile,
        },
        {
          code: `
test('normalizes a 200 status', () => expect(normalize(200)).toBe(200));
test('normalizes a 201 status', () => expect(normalize(201)).toBe(201));
test('normalizes a 202 status', () => expect(normalize(202)).toBe(202));
          `,
          filename: jestTestFile,
        },
        {
          code: `
test('normalizes a status', () => {
  const status = normalize(200);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes a status', () => {
  const status = normalize(200);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes a status', () => {
  const status = normalize(200);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});
          `,
          filename: jestTestFile,
        },
        {
          code: `
test('normalizes a 200 status', () => {
  const status = normalize(200);
  expect(status).toBe(200);
});

test('normalizes a 201 status', () => {
  const status = normalize(201);
  expect(status).toBe(201);
});

test('normalizes a 202 status', () => {
  const status = normalize(202);
  expect(status).toBe(202);
});
          `,
          filename: jestTestFile,
        },
        {
          code: `
test('builds case 1', () => {
  const value = build(1);
  expect(value.a).toBe('a');
  expect(value.b).toBe('b');
  expect(value.c).toBe('c');
});

test('builds case 2', () => {
  const value = build(2);
  expect(value.a).toBe('aa');
  expect(value.b).toBe('bb');
  expect(value.c).toBe('cc');
});

test('builds case 3', () => {
  const value = build(3);
  expect(value.a).toBe('aaa');
  expect(value.b).toBe('bbb');
  expect(value.c).toBe('ccc');
});

test('builds case 4', () => {
  const value = build(4);
  expect(value.a).toBe('aaaa');
  expect(value.b).toBe('bbbb');
  expect(value.c).toBe('cccc');
});

test('builds case 5', () => {
  const value = build(5);
  expect(value.a).toBe('aaaaa');
  expect(value.b).toBe('bbbbb');
  expect(value.c).toBe('ccccc');
});
          `,
          filename: jestTestFile,
        },
        {
          code: `
test(\`normalizes \${status}\`, () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test(\`normalizes \${otherStatus}\`, () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test(\`normalizes \${nextStatus}\`, () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});
          `,
          filename: jestTestFile,
        },
        {
          code: `
test('handles numeric status', () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('handles string status', () => {
  const value = normalize('201');
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('handles boolean status', () => {
  const value = normalize(true);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});
          `,
          filename: jestTestFile,
        },
        {
          // Current heuristic does not report when all varying literals are in the 2 body statements.
          code: `
import { test, expect } from 'vitest';

test('labels 0 degrees as north', () => {
  const heading = formatHeading(0);
  expect(heading).toBe('north');
});

test('labels 90 degrees as east', () => {
  const heading = formatHeading(90);
  expect(heading).toBe('east');
});

test('labels 180 degrees as south', () => {
  const heading = formatHeading(180);
  expect(heading).toBe('south');
});
          `,
          filename: vitestTestFile,
        },
        {
          code: `
test.each([200, 201, 202])('normalizes %i', status => {
  const value = normalize(status);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.skip('normalizes a 200 status', () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.skip('normalizes a 201 status', () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.skip('normalizes a 202 status', () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.todo('normalizes the next status');
          `,
          filename: jestTestFile,
        },
        {
          code: `
test('normalizes a 200 status', () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('normalizes a 201 status', () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('normalizes a 202 status', () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});
          `,
          filename: noFrameworkTestFile,
        },
        {
          code: `
import { it } from 'mocha';
it('normalizes a 200 status', () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

it('normalizes a 201 status', () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

it('normalizes a 202 status', () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});
          `,
          filename: noFrameworkTestFile,
        },
        {
          code: `
import { test } from '@playwright/test';
test.skip('normalizes a 200 status', async () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.skip('normalizes a 201 status', async () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.skip('normalizes a 202 status', async () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test.fixme('normalizes the next status');
          `,
          filename: playwrightTestFile,
        },
        {
          code: `
test('normalizes a 200 status', async () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('normalizes a 201 status', async () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('normalizes a 202 status', async () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});
          `,
          filename: playwrightTestFile,
        },
        {
          code: `
import 'cypress';
test('normalizes a 200 status', () => {
  const value = normalize(200);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('normalizes a 201 status', () => {
  const value = normalize(201);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});

test('normalizes a 202 status', () => {
  const value = normalize(202);
  expect(value).toBeGreaterThan(199);
  expect(value).toBeLessThan(300);
});
          `,
          filename: jestTestFile,
        },
        {
          code: `
import { describe, test } from 'vitest';
describe('outer', () => {
  test('normalizes a 200 status', () => {
    const value = normalize(200);
    expect(value).toBeGreaterThan(199);
    expect(value).toBeLessThan(300);
  });

  describe('inner', () => {
    test('normalizes a 201 status', () => {
      const value = normalize(201);
      expect(value).toBeGreaterThan(199);
      expect(value).toBeLessThan(300);
    });

    test('normalizes a 202 status', () => {
      const value = normalize(202);
      expect(value).toBeGreaterThan(199);
      expect(value).toBeLessThan(300);
    });
  });
});
          `,
          filename: vitestTestFile,
        },
      ],
      invalid: [
        {
          code: `
test('normalizes a 200 status', () => {
  const status = normalize(200);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes a 201 status', () => {
  const status = normalize(201);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});

test('normalizes a 202 status', () => {
  const status = normalize(202);
  expect(status).toBeGreaterThan(199);
  expect(status).toBeLessThan(300);
});
          `,
          filename: jestTestFile,
          settings: { sonarRuntime: true },
          errors: [{ message: SONAR_RUNTIME_MESSAGE }],
        },
        {
          code: `
import { it as check } from 'vitest';
check('renders /users', () => {
  const route = buildRoute('/users');
  render(route);
  expect(screen.url()).toContain('/users');
});

check('renders /teams', () => {
  const route = buildRoute('/teams');
  render(route);
  expect(screen.url()).toContain('/teams');
});

check('renders /projects', () => {
  const route = buildRoute('/projects');
  render(route);
  expect(screen.url()).toContain('/projects');
});
          `,
          filename: vitestTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
import 'cypress';
import { test } from 'vitest';
test('renders /users', () => {
  const route = buildRoute('/users');
  render(route);
  expect(screen.url()).toContain('/users');
});

test('renders /teams', () => {
  const route = buildRoute('/teams');
  render(route);
  expect(screen.url()).toContain('/teams');
});

test('renders /projects', () => {
  const route = buildRoute('/projects');
  render(route);
  expect(screen.url()).toContain('/projects');
});
          `,
          filename: vitestTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
test('loads /users with admin role', () => {
  const response = request('/users');
  expect(response.status).toBe(200);
  expect(response.role).toBe('admin');
  expect(response.cached).toBe(false);
});

test('loads /teams with member role', () => {
  const response = request('/teams');
  expect(response.status).toBe(201);
  expect(response.role).toBe('member');
  expect(response.cached).toBe(false);
});

test('loads /projects with owner role', () => {
  const response = request('/projects');
  expect(response.status).toBe(202);
  expect(response.role).toBe('owner');
  expect(response.cached).toBe(false);
});

test('loads /tasks with viewer role', () => {
  const response = request('/tasks');
  expect(response.status).toBe(203);
  expect(response.role).toBe('viewer');
  expect(response.cached).toBe(false);
});

test('loads /reports with guest role from cache', () => {
  const response = request('/reports');
  expect(response.status).toBe(204);
  expect(response.role).toBe('guest');
  expect(response.cached).toBe(true);
});
          `,
          filename: jestTestFile,
          errors: [{ message: MESSAGE_4 }],
        },
        {
          code: `
import { test, expect } from '@jest/globals';
test('loads the users endpoint', () => {
  const response = request('/users');
  expect(response.status).toBe(200);
  expect(response.path).toBe('/users');
});

test('loads the teams endpoint', () => {
  const response = request('/teams');
  expect(response.status).toBe(200);
  expect(response.path).toBe('/teams');
});

test('loads the projects endpoint', () => {
  const response = request('/projects');
  expect(response.status).toBe(200);
  expect(response.path).toBe('/projects');
});
          `,
          filename: jestTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
const { test: check } = require('vitest');
check('loads the users endpoint', () => {
  const response = request('/users');
  expect(response.status).toBe(200);
  expect(response.path).toBe('/users');
});

check('loads the teams endpoint', () => {
  const response = request('/teams');
  expect(response.status).toBe(200);
  expect(response.path).toBe('/teams');
});

check('loads the projects endpoint', () => {
  const response = request('/projects');
  expect(response.status).toBe(200);
  expect(response.path).toBe('/projects');
});
          `,
          filename: vitestTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
import { test } from '@playwright/test';
test('opens /users', async ({ page }) => {
  await page.goto('/users');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
});

test('opens /teams', async ({ page }) => {
  await page.goto('/teams');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
});

test('opens /projects', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
});
          `,
          filename: playwrightTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
import { test, expect } from '@playwright/test';

test('opens the planets page', async ({ page }) => {
  await page.goto('/planets');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Planets' })).toBeVisible();
});

test('opens the moons page', async ({ page }) => {
  await page.goto('/moons');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Moons' })).toBeVisible();
});

test('opens the comets page', async ({ page }) => {
  await page.goto('/comets');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Comets' })).toBeVisible();
});
          `,
          filename: playwrightTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
import { test as pwTest } from '@playwright/test';
pwTest.only('opens /users', async ({ page }) => {
  await page.goto('/users');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('Users');
});

pwTest.only('opens /teams', async ({ page }) => {
  await page.goto('/teams');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('Teams');
});

pwTest.only('opens /projects', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('Projects');
});
          `,
          filename: playwrightTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
const { test: check } = require('@playwright/test');
check.fail('loads /users', async ({ page }) => {
  await page.goto('/users');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main')).toContainText('Users');
});

check.fail('loads /teams', async ({ page }) => {
  await page.goto('/teams');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main')).toContainText('Teams');
});

check.fail('loads /projects', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('main')).toContainText('Projects');
});
          `,
          filename: playwrightTestFile,
          errors: [{ message: MESSAGE }],
        },
        {
          code: `
import * as playwright from '@playwright/test';
playwright.test.slow('shows /users', async ({ page }) => {
  await page.goto('/users');
  await page.waitForLoadState('networkidle');
  await playwright.expect(page.locator('main')).toContainText('Users');
});

playwright.test.slow('shows /teams', async ({ page }) => {
  await page.goto('/teams');
  await page.waitForLoadState('networkidle');
  await playwright.expect(page.locator('main')).toContainText('Teams');
});

playwright.test.slow('shows /projects', async ({ page }) => {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  await playwright.expect(page.locator('main')).toContainText('Projects');
});
          `,
          filename: playwrightTestFile,
          errors: [{ message: MESSAGE }],
        },
      ],
    });
  });
});
