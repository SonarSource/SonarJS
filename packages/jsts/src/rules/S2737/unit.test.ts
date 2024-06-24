/*
 * eslint-plugin-sonarjs
 * Copyright (C) 2018-2021 SonarSource SA
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
import { rule } from './rule';
import { JavaScriptRuleTester } from '../../../tests/tools';

const ruleTester = new JavaScriptRuleTester();

ruleTester.run('no-useless-catch', rule, {
  valid: [
    { code: `try {} catch (e) {}` },
    { code: `try {} catch { throw "Error"; }` },
    {
      code: `try {} catch (e) {
              foo();
              throw e;
            }`,
    },
    {
      code: `try {} catch({ message }) {
        throw { message }; // OK, not useless, we might ignore other properties of exception
      }`,
    },
    {
      code: `try {} catch (e) {
              if (x) {
                throw e;
              }
            }`,
    },
    {
      code: `try {} catch(e) { throw "foo"; }`,
    },
    {
      code: `try {} catch(e) { throw new Error("improve error message"); }`,
    },
  ],
  invalid: [
    {
      code: `try {} catch (e) { throw e; }`,
      errors: [
        {
          messageId: 'uselessCatch',
          line: 1,
          endLine: 1,
          column: 8,
          endColumn: 13,
        },
      ],
    },
    {
      code: `try {} catch(e) {
        // some comment
        throw e;
      }`,
      errors: [
        {
          messageId: 'uselessCatch',
          line: 1,
          endLine: 1,
          column: 8,
          endColumn: 13,
        },
      ],
    },
    {
      code: `try {
        doSomething();
      } catch(e) {
        throw e;
      } finally {
        // ...
      }`,
      errors: [
        {
          messageId: 'uselessCatch',
          line: 3,
          endLine: 3,
          column: 9,
          endColumn: 14,
        },
      ],
    },
  ],
});
