/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
import { rule } from './rule.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S2737', () => {
  it('S2737', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

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
  });
});
