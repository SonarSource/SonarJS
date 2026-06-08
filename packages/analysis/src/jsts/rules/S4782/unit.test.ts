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
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import path from 'node:path';
import parser from '@typescript-eslint/parser';
import { describe, it } from 'node:test';

describe('S4782', () => {
  it('S4782', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(
      `Optional property declarations should not use both '?' and 'undefined' syntax`,
      rule,
      {
        valid: [
          {
            code: `
          interface Person {
            name: string;
            address: string | undefined;
            pet?: string;
          }
          class Car {
            propWithoutType?;
            brand: string;
            insurance: (undefined | string);
            color?: string;
          }
          interface T {
            p?: undefined;
          }
          type IntersectionBaseObject = {
            specificAttribute?: string;
            otherAttribute: number;
            aThirdAttribute: boolean;
          };
          type WithoutSpecificAttribute = Omit<IntersectionBaseObject, 'specificAttribute'> & {
            specificAttribute?: undefined;
          };`,
          },
          {
            code: `
            type StringOrNumber = string | number;
            interface Example {
              attribute?: StringOrNumber;
            };
            type UndefinedAlias = undefined;
            interface Example2 {
              attribute?: UndefinedAlias;
            };
            `,
          },
          {
            code: `
            type A = string;
            type B = A;
            type C = B;
            interface Example {
              attribute?: C;
            };
            type D = undefined;
            type E = D;
            type F = E;
            interface Example2 {
              attribute?: F;
            }; 
            `,
          },
          {
            code: `
            type Recursive = string | Recursive;
            interface Example {
              attribute?: Recursive;
            };`,
          },
          {
            code: `
            type Box<T> = T;
            interface Example {
              attribute?: Box<string>;
            };
            type BoxU<T> = T;
            interface Example2 {
              attribute?: BoxU<undefined>;
            };`,
          },
        ],
        invalid: [
          {
            code: `
          interface Person {
            name: string;
            address?: string | undefined;
          }`,
            errors: [
              {
                message: `{"message":"Consider removing 'undefined' type or '?' specifier, one of them is redundant.","secondaryLocations":[{"column":31,"line":4,"endColumn":40,"endLine":4}]}`,
                line: 4,
                endLine: 4,
                column: 20,
                endColumn: 21,
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
          interface Person {
            name: string;
            address: string | undefined;
          }`,
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: `
          interface Person {
            name: string;
            address?: string;
          }`,
                  },
                ],
              },
            ],
            settings: { sonarRuntime: true },
          },
          {
            code: `
          class Person {
            address?: (string | (undefined | number));
            name: string;
          }`,
            errors: [
              {
                message: JSON.stringify({
                  message:
                    "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                  secondaryLocations: [
                    {
                      column: 33,
                      line: 3,
                      endColumn: 42,
                      endLine: 3,
                    },
                  ],
                }),
                line: 3,
                endLine: 3,
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
          class Person {
            address: (string | (undefined | number));
            name: string;
          }`,
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: `
          class Person {
            address?: (string | number);
            name: string;
          }`,
                  },
                ],
              },
            ],
            settings: { sonarRuntime: true },
          },
          {
            code: `interface T { p?: undefined | number; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: undefined | number; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: number | undefined; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | undefined; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: (undefined | number); }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: (undefined | number); }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: undefined | number | string; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: undefined | number | string; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number | string; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: number | undefined | string; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | undefined | string; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number | string; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: number | string | undefined; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | string | undefined; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number | string; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: number | (string | undefined); }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: number | (string | undefined); }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number | string; }',
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: (undefined) | number; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: (undefined) | number; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: number; }',
                  },
                ],
              },
            ],
          },
          {
            // Top-level union mixing a non-distributive generic (`Map`) with
            // an explicit `| undefined`: handled by the syntactic top-level
            // path, independent of the walker. Both quick-fix suggestions
            // apply because the `undefined` keyword sits in the root union.
            code: `interface T { p?: Map<string, number | undefined> | undefined; }`,
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: 'interface T { p: Map<string, number | undefined> | undefined; }',
                  },
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: Map<string, number | undefined>; }',
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    const noTypeCheckingRuleTester = new NoTypeCheckingRuleTester();
    noTypeCheckingRuleTester.run('S4782 reports syntactic cases without type checking', rule, {
      valid: [
        {
          code: `
          interface T {
            p?: string;
          }`,
        },
        {
          code: `
          interface T {
            p?: undefined;
          }`,
        },
        {
          code: `
          type MaybeString = string | undefined;
          interface T {
            p?: MaybeString;
          }`,
        },
      ],
      invalid: [
        {
          code: `interface T { p?: string | undefined; }`,
          errors: [
            {
              message:
                "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
              suggestions: [
                {
                  desc: 'Remove "?" operator',
                  output: 'interface T { p: string | undefined; }',
                },
                {
                  desc: 'Remove "undefined" type annotation',
                  output: 'interface T { p?: string; }',
                },
              ],
            },
          ],
        },
      ],
    });

    const semanticRuleTester = new RuleTester({
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks'),
      },
    });

    semanticRuleTester.run(
      'S4782 reports alias-based undefined types with strictNullChecks',
      rule,
      {
        valid: [
          {
            code: `
            type StringOrNumber = string | number;
            interface Example {
              attribute?: StringOrNumber;
            };
            type UndefinedAlias = undefined;
            interface Example2 {
              attribute?: UndefinedAlias;
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            code: `
            type A = string;
            type B = A;
            type C = B;
            interface Example {
              attribute?: C;
            };
            type D = undefined;
            type E = D;
            type F = E;
            interface Example2 {
              attribute?: F;
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            code: `
            import type { FakeUndefinedUnion } from 'fake-lib';
            interface Example {
              attribute?: FakeUndefinedUnion;
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // JS-1789 Peach-comment reproducer: React.ReactNode resolves to a
            // union containing undefined, but the user cannot edit React's
            // declaration. Suppress.
            code: `
            import type * as React from 'react';
            interface MarkObj {
              label?: React.ReactNode;
            }
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            code: `
            import type { FakeUndefinedUnion } from 'fake-lib';
            interface Example {
              attribute?: FakeUndefinedUnion | string;
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // External generic carrying a non-undefined argument: nothing to flag.
            code: `
            import type { FakeMaybeRef } from 'fake-lib';
            interface Example {
              attribute?: FakeMaybeRef<string>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // External generic whose argument is an external alias that already
            // carries `undefined`: the user did not write `undefined` inline, so
            // it stays suppressed (mirrors the React.ReactNode rationale).
            code: `
            import type { FakeMaybeRef, FakeUndefinedUnion } from 'fake-lib';
            interface Example {
              attribute?: FakeMaybeRef<FakeUndefinedUnion>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // Top-level `undefined` comes from the external `FakeNullableWrapper`;
            // the inline `| undefined` is buried inside a `Map` value type, which
            // does not distribute to the top-level union. Removing the buried
            // keyword would not change the property's nullability — the walker
            // must NOT flag this case.
            code: `
            import type { FakeNullableWrapper } from 'fake-lib';
            interface Example {
              attribute?: FakeNullableWrapper<Map<string, number | undefined>>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // Same selectivity check with `Array` in place of `Map`: a buried
            // inline `| undefined` inside a non-distributive generic must not
            // trip the walker.
            code: `
            import type { FakeNullableWrapper } from 'fake-lib';
            interface Example {
              attribute?: FakeNullableWrapper<Array<string | undefined>>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
        ],
        invalid: [
          {
            code: `
            import type { FakeUndefinedUnion } from 'fake-lib';
            type LocalUndefinedUnion = number | undefined;
            interface Example {
              attribute?: FakeUndefinedUnion | LocalUndefinedUnion;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            import type { FakeUndefinedUnion } from 'fake-lib';
            type LocalUndefinedUnion = number | undefined;
            interface Example {
              attribute: FakeUndefinedUnion | LocalUndefinedUnion;
            };`,
                  },
                ],
              },
            ],
          },
          {
            code: `
            import type { FakeUndefinedUnion } from 'fake-lib';
            type LocalAlias = FakeUndefinedUnion;
            interface Example {
              attribute?: LocalAlias;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            import type { FakeUndefinedUnion } from 'fake-lib';
            type LocalAlias = FakeUndefinedUnion;
            interface Example {
              attribute: LocalAlias;
            };`,
                  },
                ],
              },
            ],
          },
          {
            code: `type StringOrUndefined = string | undefined;
            interface Example {
              attribute?: StringOrUndefined;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `type StringOrUndefined = string | undefined;
            interface Example {
              attribute: StringOrUndefined;
            };`,
                  },
                ],
              },
            ],
          },
          {
            code: `type NumberOrUndefined = number | undefined;
            interface Example {
              attribute?: string | NumberOrUndefined;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `type NumberOrUndefined = number | undefined;
            interface Example {
              attribute: string | NumberOrUndefined;
            };`,
                  },
                ],
              },
            ],
          },
          {
            code: `
            type NumberOrUndefined = number | undefined;
            type Attribute = string | NumberOrUndefined;
            interface Example {
              attribute?: Attribute;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            type NumberOrUndefined = number | undefined;
            type Attribute = string | NumberOrUndefined;
            interface Example {
              attribute: Attribute;
            };`,
                  },
                ],
              },
            ],
          },
          {
            code: `
            type Maybe<T> = T | undefined;
            interface Example {
              attribute?: Maybe<string>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            type Maybe<T> = T | undefined;
            interface Example {
              attribute: Maybe<string>;
            };`,
                  },
                ],
              },
            ],
          },
          {
            code: `
            type Recursive<T> = T | Recursive<T>[];
            type RecursiveUndefined = Recursive<string | undefined>;
            interface Example {
              attribute?: RecursiveUndefined;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            type Recursive<T> = T | Recursive<T>[];
            type RecursiveUndefined = Recursive<string | undefined>;
            interface Example {
              attribute: RecursiveUndefined;
            };`,
                  },
                ],
              },
            ],
          },
          {
            // Adamant-im reproducer: external generic wrapping an inline
            // `T | undefined`. The user authored the `undefined` keyword inside
            // the type argument and can edit it, so the property must still be
            // flagged even though the top-level `FakeMaybeRef` is external.
            code: `
            import type { FakeMaybeRef } from 'fake-lib';
            interface Example {
              attribute?: FakeMaybeRef<string | undefined>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            import type { FakeMaybeRef } from 'fake-lib';
            interface Example {
              attribute: FakeMaybeRef<string | undefined>;
            };`,
                  },
                ],
              },
            ],
          },
          {
            // Same shape with a project-defined type alias as the non-undefined
            // member of the inline union (mirrors lines 8-9 of the report).
            code: `
            import type { FakeMaybeRef } from 'fake-lib';
            type Status = 'idle' | 'loading';
            interface Example {
              attribute?: FakeMaybeRef<Status | undefined>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            import type { FakeMaybeRef } from 'fake-lib';
            type Status = 'idle' | 'loading';
            interface Example {
              attribute: FakeMaybeRef<Status | undefined>;
            };`,
                  },
                ],
              },
            ],
          },
          {
            // The buried inline `| undefined` doesn't trigger the walker (Map
            // is non-distributive), but the wrapper is project-local — the
            // user can edit `NullableWrap` to remove its `| undefined`, so the
            // classifier path still flags the property.
            code: `
            type NullableWrap<T> = T | undefined;
            interface Example {
              attribute?: NullableWrap<Map<string, number | undefined>>;
            };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
                suggestions: [
                  {
                    desc: 'Remove "?" operator',
                    output: `
            type NullableWrap<T> = T | undefined;
            interface Example {
              attribute: NullableWrap<Map<string, number | undefined>>;
            };`,
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    const noStrictNullRuleTester = new RuleTester({
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures', 'no-strict-null-checks'),
      },
    });

    noStrictNullRuleTester.run(
      'S4782 does not report alias-based undefined types when strictNullChecks is disabled',
      rule,
      {
        valid: [
          {
            code: `
            type MaybeString = string | undefined;
            interface Example {
              attribute?: MaybeString;
            };`,
            filename: path.join(
              import.meta.dirname,
              'fixtures',
              'no-strict-null-checks',
              'index.ts',
            ),
          },
          {
            code: `
            type StringOrUndefined = string | undefined;
            interface Example {
              attribute?: StringOrUndefined;
            };`,
            filename: path.join(
              import.meta.dirname,
              'fixtures',
              'no-strict-null-checks',
              'index.ts',
            ),
          },
          {
            code: `
            type NumberOrUndefined = number | undefined;
            interface Example {
              attribute?: string | NumberOrUndefined;
            };`,
            filename: path.join(
              import.meta.dirname,
              'fixtures',
              'no-strict-null-checks',
              'index.ts',
            ),
          },
          {
            code: `
            type NumberOrUndefined = number | undefined;
            type Attribute = string | NumberOrUndefined;
            interface Example {
              attribute?: Attribute;
            };`,
            filename: path.join(
              import.meta.dirname,
              'fixtures',
              'no-strict-null-checks',
              'index.ts',
            ),
          },
          {
            code: `
            type Maybe<T> = T | undefined;
            interface Example {
              attribute?: Maybe<string>;
            };`,
            filename: path.join(
              import.meta.dirname,
              'fixtures',
              'no-strict-null-checks',
              'index.ts',
            ),
          },
        ],
        invalid: [],
      },
    );

    const noopRuleTester = new RuleTester({
      parser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        project: `tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    noopRuleTester.run('S4782 becomes noop when exactOptionalPropertyTypes is enabled', rule, {
      valid: [
        {
          code: 'interface T { p?: string | undefined; }',
          filename: path.join(import.meta.dirname, 'fixtures', 'index.ts'),
        },
      ],
      invalid: [],
    });
  });
});
