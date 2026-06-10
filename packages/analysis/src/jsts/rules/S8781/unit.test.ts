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

describe('S8781', () => {
  it('S8781', () => {
    const ruleTester = new DefaultParserRuleTester();
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');

    ruleTester.run('Test and suite titles should not be empty or whitespace-only', rule, {
      valid: [
        {
          code: `
const jest = require('jest');
it('renders bold markdown as <strong> HTML', async () => {});
test('sends a magic link from the login page', async () => {});
describe('invite link validation', () => {
  it('rejects expired invite links', () => {});
});
          `,
          filename: 'markdown.test.js',
        },
        {
          code: `
import { describe, it } from 'vitest';
describe(\`invite link validation\`, () => {
  it(\`rejects expired invite links\`, () => {});
});
          `,
          filename: 'invite.test.ts',
        },
        {
          code: `
const mocha = require('mocha');
const { it } = mocha;
const title = '';
it(title, () => {});
it(\`\${title}\`, () => {});
          `,
          filename: 'dynamic.test.js',
        },
        {
          code: `
describe('no supported framework', () => {
  it('', () => {});
});
          `,
          filename: noFrameworkFixture,
        },
        {
          code: `
import { describe, test } from 'vitest';
describe.each([1, 2])(' ', () => {
  test('runs case', () => {});
});
test.for([1, 2])(' ', () => {});
          `,
          filename: 'parameterized.test.ts',
        },
        {
          code: `
import { test } from '@playwright/test';
test.skip(isMobile, 'mobile only');
test.fail(browserName === 'webkit', 'known issue');
test.fixme(hasBug, 'needs fix');
          `,
          filename: 'annotations.spec.ts',
        },
        {
          code: `
import { test } from '@playwright/test';
test.describe('checkout', () => {
  test('applies a discount code', async () => {});
});
test.describe.parallel('guest checkout', () => {});
test.describe.serial.only('registered checkout', () => {});
          `,
          filename: 'checkout.spec.ts',
        },
      ],
      invalid: [
        {
          code: `
const jest = require('jest');
it('', async () => {});
          `,
          filename: 'markdown.test.js',
          errors: [{ message: 'Replace this empty test title with a descriptive name.' }],
        },
        {
          code: `
const jest = require('jest');
test('   ', async () => {});
          `,
          filename: 'login.test.js',
          errors: 1,
        },
        {
          code: `
const jest = require('jest');
describe('   ', () => {
  it('rejects expired invite links', () => {});
});
          `,
          filename: 'invite.test.js',
          errors: 1,
        },
        {
          code: `
import { describe } from 'vitest';
describe('\t', () => {});
          `,
          filename: 'suite.test.ts',
          errors: 1,
        },
        {
          code: `
const mocha = require('mocha');
context(\`
\`, () => {});
          `,
          filename: 'context.test.js',
          errors: 1,
        },
        {
          code: `
const jest = require('jest');
describe('focused tests', () => {
  it.only('', () => {});
  test.concurrent(' ', () => {});
  test.failing('\\n', () => {});
});
          `,
          filename: 'focused.test.js',
          errors: 3,
        },
        {
          code: `
import { describe, test } from 'vitest';
describe.sequential(' ', () => {});
test.concurrent('\t', () => {});
          `,
          filename: 'vitest.test.ts',
          errors: 2,
        },
        {
          code: `
import { test } from '@playwright/test';
test('', async ({ page }) => {});
test.only(' ', async () => {});
test.describe.parallel(' ', () => {});
test.describe.serial.only('\t', () => {});
          `,
          filename: 'checkout.spec.ts',
          errors: 4,
        },
      ],
    });
  });
});
