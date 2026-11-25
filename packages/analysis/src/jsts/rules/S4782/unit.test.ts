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
import assert from 'node:assert/strict';
import { Linter } from 'eslint';
import ts from 'typescript';

describe('S4782', () => {
  for (const { code, needsUndefinedWithoutStrictNullChecks } of [
    {
      code: 'export interface T { p?: string | undefined; }',
      needsUndefinedWithoutStrictNullChecks: false,
    },
    {
      code: 'export interface T { p?: never | undefined; }',
      needsUndefinedWithoutStrictNullChecks: true,
    },
    {
      code: 'type Empty = never; export interface T { p?: Empty | undefined; }',
      needsUndefinedWithoutStrictNullChecks: true,
    },
    {
      code: 'export interface T { p?: (string & number) | undefined; }',
      needsUndefinedWithoutStrictNullChecks: true,
    },
    {
      code: 'type Empty = never; export interface T { p?: never | (Empty | undefined); }',
      needsUndefinedWithoutStrictNullChecks: true,
    },
    {
      code: 'export interface T { p?: never | string | undefined; }',
      needsUndefinedWithoutStrictNullChecks: false,
    },
    {
      code: 'export interface T { p?: never | undefined | undefined; }',
      needsUndefinedWithoutStrictNullChecks: false,
    },
  ]) {
    it(`loose-mode suggestions preserve accepted inputs: ${code}`, () => {
      const filename = path.join(import.meta.dirname, 'fixtures', 'index.ts');
      for (const strictNullChecks of [false, true]) {
        const options: ts.CompilerOptions = {
          strictNullChecks,
          exactOptionalPropertyTypes: false,
          types: [],
        };
        function createProgram(text: string) {
          const host = ts.createCompilerHost(options);
          const readFile = host.readFile;
          host.readFile = file =>
            path.normalize(file) === path.normalize(filename) ? text : readFile(file);
          return ts.createProgram([filename], options, host);
        }
        const messages = new Linter({ cwd: import.meta.dirname }).verify(
          code,
          [
            {
              files: ['**/*.ts'],
              languageOptions: { parser, parserOptions: { programs: [createProgram(code)] } },
              plugins: { sonarjs: { rules: { S4782: rule } } },
              rules: { 'sonarjs/S4782': 'error' },
            },
          ],
          { filename },
        );
        assert.equal(
          messages.length,
          !strictNullChecks && needsUndefinedWithoutStrictNullChecks ? 0 : 1,
        );
        const suggestions = messages[0]?.suggestions ?? [];
        if (messages.length > 0) {
          assert.ok(suggestions.length, JSON.stringify(messages));
        }
        for (const suggestion of suggestions.length > 0 ? suggestions : [undefined]) {
          const fixed = suggestion
            ? code.slice(0, suggestion.fix.range[0]) +
              suggestion.fix.text +
              code.slice(suggestion.fix.range[1])
            : code;
          const proof = `
          namespace Before { ${code} }
          namespace After { ${fixed} }
          declare const before: Before.T;
          declare const after: After.T;
          const forward: After.T = before;
          const reverse: Before.T = after;
          const omittedBefore: Before.T = {};
          const omittedAfter: After.T = {};
          const undefinedBefore: Before.T = { p: undefined };
          const undefinedAfter: After.T = { p: undefined };
          type Shared = string | null | undefined;
          namespace AliasBefore { export interface T { p?: Shared; } }
          namespace AliasAfter { export interface T { p?: Exclude<Shared, undefined>; } }
          declare const aliasBefore: AliasBefore.T;
          declare const aliasAfter: AliasAfter.T;
          const aliasForward: AliasAfter.T = aliasBefore;
          const aliasReverse: AliasBefore.T = aliasAfter;
          const aliasOmitted: AliasAfter.T = {};
          const aliasUndefined: AliasAfter.T = { p: undefined };
          const aliasNull: AliasAfter.T = { p: null };
          interface RequiredProperty { p: string | undefined; }
          // @ts-expect-error Removing ? rejects omission even in loose mode.
          const invalidOmission: RequiredProperty = {};
          // @ts-expect-error The accepted value type must not widen.
          const invalidValue: After.T = { p: 42 };
        `;
          const program = createProgram(proof);
          const source = program.getSourceFile(filename);
          assert.ok(source);
          assert.deepEqual(
            [
              ...program.getSyntacticDiagnostics(source),
              ...program.getSemanticDiagnostics(source),
            ].map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')),
            [],
            `strictNullChecks=${strictNullChecks}, suggestion=${suggestion?.desc ?? 'none'}`,
          );
        }
      }
    });
  }

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
          {
            code: `interface T {
              required: string | undefined;
              nullable?: string | null;
              anything?: any;
              unknown?: unknown;
            }
            declare function f(p?: string | undefined): void;
            type Callback = (p?: string | undefined) => void;
            class C { method(p?: string | undefined): void {} }`,
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
                message: `{"message":"Consider removing the redundant 'undefined' type.","secondaryLocations":[{"column":31,"line":4,"endColumn":40,"endLine":4}]}`,
                line: 4,
                endLine: 4,
                column: 20,
                endColumn: 21,
                suggestions: [
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
                  message: "Consider removing the redundant 'undefined' type.",
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
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
    noTypeCheckingRuleTester.run('S4782 requires compiler options even for syntactic cases', rule, {
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
        {
          code: `interface T { p?: string | undefined; }`,
        },
        {
          code: `class T { p?: string | (number | undefined); }`,
        },
      ],
      invalid: [],
    });

    const semanticRuleTester = new RuleTester({
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks'),
      },
    });

    semanticRuleTester.run(
      'S4782 reports syntactic cases with exact optional properties disabled',
      rule,
      {
        valid: [
          {
            code: `interface T { p?: string; }
          const omitted: T = {};
          const explicitUndefined: T = { p: undefined };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
        ],
        invalid: [
          {
            code: `interface T { p?: string | undefined; }
          const omitted: T = {};
          const explicitUndefined: T = { p: undefined };`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: `interface T { p?: string; }
          const omitted: T = {};
          const explicitUndefined: T = { p: undefined };`,
                  },
                ],
              },
            ],
          },
          {
            code: `interface T { p?: string | undefined; }`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: 'interface T { p?: string; }',
                  },
                ],
              },
            ],
          },
          {
            code: `type MaybeText = string | undefined;
          class T { p?: undefined | MaybeText; }`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message: "Consider removing the redundant 'undefined' type.",
                suggestions: [
                  {
                    desc: 'Remove "undefined" type annotation',
                    output: `type MaybeText = string | undefined;
          class T { p?: MaybeText; }`,
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    semanticRuleTester.run(
      'S4782 reports alias-based undefined types with strictNullChecks',
      rule,
      {
        valid: [
          {
            code: `type Shared = string | undefined;
            interface Example { attribute?: Exclude<Shared, undefined>; }`,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
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
            // JS-2192: an imported optional property resolves to a union with
            // undefined, but its declaration cannot be changed locally.
            code: `
            import type { FakeExternalProperties } from 'fake-lib';
            interface Example {
              attribute?: FakeExternalProperties['optional'];
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // A no-substitution template literal index names the property just
            // like a string literal does.
            code: `
            import type { FakeExternalProperties } from 'fake-lib';
            interface Example {
              attribute?: FakeExternalProperties[\`optional\`];
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
          },
          {
            // JS-2192: the access resolves through an index signature declared
            // externally, so the `undefined` is just as unremovable.
            code: `
            import type { FakeExternalRecord } from 'fake-lib';
            interface Example {
              attribute?: FakeExternalRecord['anyKey'];
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
            // The same indexed-access form remains reportable when its
            // optional property is declared in the project.
            code: `
            interface LocalProperties {
              optional?: string;
            }
            interface Example {
              attribute?: LocalProperties['optional'];
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "The type annotation 'LocalProperties['optional']' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
              },
            ],
          },
          {
            // An index signature declared in the project stays reportable: the
            // user can drop `| undefined` from their own signature.
            code: `
            interface LocalIndexed {
              [key: string]: string | undefined;
            }
            interface Example {
              attribute?: LocalIndexed['anyKey'];
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "The type annotation 'LocalIndexed['anyKey']' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
              },
            ],
          },
          {
            // A non-literal index cannot be resolved to a declaration, so the
            // access stays reportable even against an external type.
            code: `
            import type { FakeExternalProperties } from 'fake-lib';
            type Key = 'optional';
            interface Example {
              attribute?: FakeExternalProperties[Key];
            };
            `,
            filename: path.join(import.meta.dirname, 'fixtures', 'strict-null-checks', 'index.ts'),
            errors: [
              {
                message:
                  "The type annotation 'FakeExternalProperties[Key]' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
              },
            ],
          },
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
                  "The type annotation 'FakeUndefinedUnion | LocalUndefinedUnion' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'LocalAlias' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'StringOrUndefined' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'string | NumberOrUndefined' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'Attribute' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'Maybe<string>' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'RecursiveUndefined' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'FakeMaybeRef<string | undefined>' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'FakeMaybeRef<Status | undefined>' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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
                  "The type annotation 'NullableWrap<Map<string, number | undefined>>' includes 'undefined'. Use a type without 'undefined' here, keeping '?'.",
                suggestions: [],
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

    const implicitStrictRuleTester = new RuleTester({
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures', 'implicit-strict'),
      },
    });
    const implicitStrictFile = path.join(
      import.meta.dirname,
      'fixtures',
      'implicit-strict',
      'index.ts',
    );
    implicitStrictRuleTester.run(
      'S4782 detects local undefined aliases with TypeScript 6 defaults',
      rule,
      {
        valid: [
          {
            code: `interface Example { attribute?: string; }`,
            filename: implicitStrictFile,
          },
        ],
        invalid: [
          {
            code: `type MaybeString = string | undefined;
            interface Example { attribute?: MaybeString; }`,
            filename: implicitStrictFile,
            errors: 1,
          },
        ],
      },
    );

    const exactOptionalRuleTester = new RuleTester({
      parser,
      ecmaVersion: 2018,
      sourceType: 'module',
      parserOptions: {
        project: `tsconfig.json`,
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    const exactOptionalFile = path.join(import.meta.dirname, 'fixtures', 'index.ts');
    exactOptionalRuleTester.run('S4782 preserves exact optional property types', rule, {
      valid: [
        {
          code: 'interface T { p?: string | undefined; }',
          filename: exactOptionalFile,
        },
        {
          code: `interface Evidence { assessedAt: string; }
          interface T { p?: Evidence['assessedAt'] | undefined; }`,
          filename: exactOptionalFile,
        },
        {
          code: `type Text = string;
          class T { p?: Text | undefined; }`,
          filename: exactOptionalFile,
        },
        {
          code: `interface T {
            p?: string | (number | undefined);
            nullable?: string | null | undefined;
            onlyUndefined?: undefined;
            nullOrUndefined?: null | undefined;
            anything?: any;
          }`,
          filename: exactOptionalFile,
        },
        {
          code: `type MaybeText = string | undefined;
          interface T {
            p?: MaybeText;
            values?: Map<string, string | undefined> | undefined;
          }
          declare function f(p?: MaybeText | undefined): void;
          type Callback = (p?: MaybeText | undefined) => void;`,
          filename: exactOptionalFile,
        },
        {
          code: `interface T { p?: string | undefined; }
          const omitted: T = {};
          const presentUndefined: T = { p: undefined };
          const presentString: T = { p: 'value' };
          // @ts-expect-error The value must still be a string or undefined.
          const invalid: T = { p: 42 };`,
          filename: exactOptionalFile,
        },
        {
          code: `declare const source: { value?: string };
          interface T { p?: typeof source.value | undefined; }`,
          filename: exactOptionalFile,
        },
        {
          code: `declare const source: { value?: string };
          type Value = typeof source.value;
          interface T { p?: Value | undefined; }`,
          filename: exactOptionalFile,
        },
      ],
      invalid: [
        {
          code: `declare const source: { value?: string | undefined };
          interface T { p?: typeof source.value | undefined; }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `declare const source: { value?: string | undefined };
          interface T { p?: typeof source.value; }`,
                },
              ],
            },
          ],
        },
        {
          code: `type Value = string | undefined;
          interface T { p?: Value | undefined; }`,
          filename: exactOptionalFile,
          settings: { sonarRuntime: true },
          errors: [
            {
              message: `{"message":"Remove this redundant 'undefined' type annotation.","secondaryLocations":[]}`,
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `type Value = string | undefined;
          interface T { p?: Value; }`,
                },
              ],
            },
          ],
        },
        {
          code: `interface ColorDetails { localizedNames?: string[]; }
          interface T { p?: ColorDetails['localizedNames'] | undefined; }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              line: 2,
              column: 62,
              endColumn: 71,
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `interface ColorDetails { localizedNames?: string[]; }
          interface T { p?: ColorDetails['localizedNames']; }`,
                },
              ],
            },
          ],
        },
        {
          code: `interface Evidence { validUntil?: string | undefined; }
          interface T { readonly p?: Evidence['validUntil'] | undefined; }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `interface Evidence { validUntil?: string | undefined; }
          interface T { readonly p?: Evidence['validUntil']; }`,
                },
              ],
            },
          ],
        },
        {
          code: `type MaybeText = string | undefined;
          class T { p?: undefined | MaybeText; }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `type MaybeText = string | undefined;
          class T { p?: MaybeText; }`,
                },
              ],
            },
          ],
        },
        {
          code: `type MaybeText = string | undefined;
          interface T { p?: number | (MaybeText | undefined); }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `type MaybeText = string | undefined;
          interface T { p?: number | MaybeText; }`,
                },
              ],
            },
          ],
        },
        {
          code: `type MaybeText = string | undefined;
          interface T { p?: number | undefined | MaybeText; }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `type MaybeText = string | undefined;
          interface T { p?: number | MaybeText; }`,
                },
              ],
            },
          ],
        },
        {
          code: `interface T { p?: undefined | string | undefined; }`,
          filename: exactOptionalFile,
          errors: [
            {
              message: "Remove this redundant 'undefined' type annotation.",
              suggestions: [
                {
                  desc: 'Remove "undefined" type annotation',
                  output: `interface T { p?: string | undefined; }`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
