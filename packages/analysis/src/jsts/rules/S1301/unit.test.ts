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
        {
          // Exhaustiveness check with member expression discriminant: const _: never = action.type
          code: `
            type Action = { type: 'load' };
            function reduce(action: Action, state: unknown): unknown {
              switch (action.type) {
                case 'load':
                  return state;
                default:
                  const _: never = action.type;
                  return _;
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
        {
          // Exhaustiveness check with member expression discriminant: assertNever(action.type)
          code: `
            function assertNever(x: never): never {
              throw new Error('Unhandled action: ' + x);
            }
            type Action = { type: 'load' };
            function reduce(action: Action, state: unknown): unknown {
              switch (action.type) {
                case 'load':
                  return state;
                default:
                  assertNever(action.type);
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
        {
          // Plain helper call — `logValue` does not return `never`, so not an exhaustiveness sentinel
          code: `
            function logValue(x: unknown): void { console.log(x); }
            type Status = 'active';
            function handleStatus(status: Status): void {
              switch (status) {
                case 'active':
                  console.log('active');
                  break;
                default:
                  logValue(status);
              }
            }
          `,
          errors: 1,
        },
        {
          // console.log does not return `never`, so it is not an exhaustiveness sentinel
          code: `
            type Status = 'active';
            function handleStatus(status: Status): void {
              switch (status) {
                case 'active':
                  console.log('active');
                  break;
                default:
                  console.log(status);
              }
            }
          `,
          errors: 1,
        },
        {
          // `failWith` returns `never` but its parameter is `unknown`, not `never` — not a sentinel
          code: `
            function failWith(x: unknown): never { throw new Error(String(x)); }
            type Status = 'active';
            function handleStatus(status: Status): void {
              switch (status) {
                case 'active':
                  break;
                default:
                  failWith(status);
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

  it('should flag switch where `: never` variable is assigned from an unrelated never-returning function, not the discriminant', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
      valid: [],
      invalid: [
        {
          // `fail()` returns `never` but is not the switch discriminant — still flagged
          code: `
            function fail(): never { throw new Error('boom'); }
            function handle(x: string): void {
              switch (x) {
                case 'a':
                  break;
                default:
                  const _exhaustiveCheck: never = fail();
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('should flag switch where assertNever receives a never-returning function call instead of the discriminant', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('"if" statements should be preferred over "switch" when simpler', rule, {
      valid: [],
      invalid: [
        {
          // `fail()` returns `never` but is not the switch discriminant — still flagged
          code: `
            function fail(): never { throw new Error('boom'); }
            function assertNever(x: never): never { throw new Error(String(x)); }
            function handle(x: string): void {
              switch (x) {
                case 'a':
                  break;
                default:
                  return assertNever(fail());
              }
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
