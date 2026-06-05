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

describe('S8754', () => {
  it('S8754', () => {
    const ruleTester = new DefaultParserRuleTester();
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');

    ruleTester.run('Test titles should be unique within the same suite', rule, {
      valid: [
        {
          code: `
const jest = require('jest');
describe('shopping cart', () => {
  it('adds an item to an empty cart', () => {});
  it('adds an item to an existing cart', () => {});
});
          `,
          filename: 'cart.test.js',
        },
        {
          code: `
const jest = require('jest');
describe('security preferences', () => {
  it('saves preferences', () => {});
});
describe('email preferences', () => {
  it('saves preferences', () => {});
});
          `,
          filename: 'preferences.test.js',
        },
        {
          code: `
const jest = require('jest');
describe('settings', () => {
  it('saves preferences', () => {});
  describe('email preferences', () => {
    it('saves preferences', () => {});
  });
});
          `,
          filename: 'preferences.test.js',
        },
        {
          code: `
const jest = require('jest');
describe('checkout', () => {
  it('applies a discount code', () => {});
});
describe('checkout', () => {
  it('removes a discount code', () => {});
});
          `,
          filename: 'checkout.test.js',
        },
        {
          code: `
const jest = require('jest');
describe('dynamic titles', () => {
  it(\`case \${name}\`, () => {});
  it(title, () => {});
});
          `,
          filename: 'dynamic.test.js',
        },
        {
          code: `
const jest = require('jest');
describe('template titles', () => {
  it(\`loads profile\`, () => {});
  it('loads settings', () => {});
});
          `,
          filename: 'profile.test.js',
        },
        {
          code: `
describe('no supported framework', () => {
  it('adds an item', () => {});
  it('adds an item', () => {});
});
          `,
          filename: noFrameworkFixture,
        },
        {
          code: `
import { test } from '@playwright/test';
test.describe.parallel('checkout', () => {
  test('applies a discount code', () => {});
});
test.describe.serial('guest checkout', () => {
  test('applies a discount code', () => {});
});
          `,
          filename: 'checkout.spec.ts',
        },
      ],
      invalid: [
        {
          code: `
const jest = require('jest');
describe('shopping cart', () => {
  it('adds an item', () => {});
  it('adds an item', () => {});
});
          `,
          filename: 'cart.test.js',
          errors: [
            {
              message: 'Rename this test title to make it unique within the suite.',
            },
          ],
        },
        {
          code: `
const jest = require('jest');
describe('shopping cart', () => {
  test('removes an item', () => {});
  test('removes an item', () => {});
});
          `,
          filename: 'cart.test.js',
          errors: 1,
        },
        {
          code: `
const jest = require('jest');
describe('settings', () => {
  describe('email preferences', () => {
    it('saves preferences', () => {});
    it('saves preferences', () => {});
  });
});
          `,
          filename: 'preferences.test.js',
          errors: 1,
        },
        {
          code: `
import { test } from '@playwright/test';
test.describe('checkout', () => {
  test('applies a discount code', () => {});
  test('applies a discount code', () => {});
});
          `,
          filename: 'checkout.spec.ts',
          errors: 1,
        },
        {
          code: `
const { test } = require('vitest');
test('loads profile', () => {});
test('loads profile', () => {});
          `,
          filename: 'profile.test.js',
          errors: 1,
        },
        {
          code: `
const jest = require('jest');
describe('cart', () => {
  it('adds', () => {});
  it('adds', () => {});
});
          `,
          filename: 'cart.test.js',
          settings: { sonarRuntime: true },
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message: 'Rename this test title to make it unique within the suite.',
                  secondaryLocations: [
                    {
                      message: 'Original test title.',
                      column: 5,
                      line: 4,
                      endColumn: 11,
                      endLine: 4,
                    },
                  ],
                }),
              },
            },
          ],
        },
      ],
    });
  });
});
