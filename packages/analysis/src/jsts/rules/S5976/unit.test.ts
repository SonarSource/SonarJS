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
  expect(value.a).toBe('aaa');
  expect(value.b).toBe('bbb');
  expect(value.c).toBe('ccc');
});

test('builds case 5', () => {
  const value = build(5);
  expect(value.a).toBe('aaa');
  expect(value.b).toBe('bbb');
  expect(value.c).toBe('ccc');
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
          filename: noFrameworkTestFile,
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
      ],
    });
  });
});
