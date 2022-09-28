/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { rule } from 'linting/eslint/rules/inverted-assertion-arguments';
import { RuleTester } from 'eslint';

// the behaviour of the rule is tested in another file; here we are just testing its quick fixes
// until https://github.com/SonarSource/SonarJS/issues/3047 is done

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Assertion arguments should be passed in the correct order', rule, {
  valid: [
    {
      code: `
const assert = require('chai').assert;
describe('suite', () => {
  it('test', () => {
    assert.fail(aNumber, 42);
  });
});`,
    },
  ],
  invalid: [
    {
      code: `
const assert = require('chai').assert;
describe('suite', () => {
  it('test', () => {
    assert
      .fail(
        42,
         aNumber
            );
  });
});`,
      errors: [
        {
          suggestions: [
            {
              output: `
const assert = require('chai').assert;
describe('suite', () => {
  it('test', () => {
    assert
      .fail(
        aNumber,
         42
            );
  });
});`,
            },
          ],
        },
      ],
    },
  ],
});
