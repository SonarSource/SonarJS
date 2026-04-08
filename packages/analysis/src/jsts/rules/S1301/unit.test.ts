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
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1301', () => {
  it('S1301', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
      valid: [
        { code: 'switch (a) { case 1: case 2: break; default: doSomething(); break; }' },
        { code: 'switch (a) { case 1: break; default: doSomething(); break; case 2: }' },
        { code: 'switch (a) { case 1: break; case 2: }' },
      ],
      invalid: [
        {
          code: 'switch (a) { case 1: doSomething(); break; default: doSomething(); }',
          errors: [
            {
              messageId: 'replaceSwitch',
              column: 1,
              endColumn: 7,
            },
          ],
        },
        {
          code: 'switch (a) { case 1: break; }',
          errors: [
            {
              messageId: 'replaceSwitch',
              column: 1,
              endColumn: 7,
            },
          ],
        },
        {
          code: 'switch (a) {}',
          errors: [
            {
              messageId: 'replaceSwitch',
              column: 1,
              endColumn: 7,
            },
          ],
        },
      ],
    });
  });

  it('should not flag switch with never type annotation in default case', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
      valid: [
        {
          // Exhaustiveness check: const _exhaustiveCheck: never = x — not replaceable with if
          code: `
            type Direction = 'north';
            function describeDirection(direction: Direction): string {
              switch (direction) {
                case 'north':
                  return 'heading north';
                default:
                  const _exhaustiveCheck: never = direction;
                  return _exhaustiveCheck;
              }
            }
          `,
        },
      ],
      invalid: [
        {
          // Single-case switch without never assertion — still flagged
          code: `
            function handle(x: string): void {
              switch (x) {
                case 'a':
                  console.log('a');
                  break;
                default:
                  console.log('other');
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should not flag switch with assertNever call on never-typed argument in default case', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
      valid: [
        {
          // Exhaustiveness check: assertNever(x) where x is narrowed to never by TypeScript
          code: `
            function assertNever(x: never): never {
              throw new Error('Unhandled discriminated union member: ' + x);
            }
            type Status = 'active';
            function handleStatus(status: Status): string {
              switch (status) {
                case 'active':
                  return 'processing active status';
                default:
                  assertNever(status);
              }
            }
          `,
        },
        {
          // Exhaustiveness check via return statement: return assertNever(x) where x is narrowed to never
          code: `
            function assertNever(x: never): never {
              throw new Error('Unhandled: ' + x);
            }
            type Status = 'active';
            function handleStatus(status: Status): never {
              switch (status) {
                case 'active':
                  throw new Error('active');
                default:
                  return assertNever(status);
              }
            }
          `,
        },
        {
          // Exhaustiveness check via throw statement: throw assertNever(x) where x is narrowed to never
          code: `
            function assertNever(x: never): never {
              throw new Error('Unhandled: ' + x);
            }
            type Status = 'active';
            function handleStatus(status: Status): void {
              switch (status) {
                case 'active':
                  console.log('active');
                  break;
                default:
                  throw assertNever(status);
              }
            }
          `,
        },
      ],
      invalid: [
        {
          // Default case throws a plain error (argument not never-typed), so still flagged
          code: `
            type Status = 'active';
            function handleStatus(status: Status): string {
              switch (status) {
                case 'active':
                  return 'active';
                default:
                  throw new Error('unreachable');
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should flag switch where default case has destructuring declaration without never annotation', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
      valid: [],
      invalid: [
        {
          // Destructuring pattern in default — d.id.type !== 'Identifier', no never annotation
          code: `
            function handle(x: string): void {
              switch (x) {
                case 'a':
                  break;
                default:
                  const [a] = [x];
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
