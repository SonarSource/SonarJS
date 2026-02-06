/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4335', () => {
  it('S4335', () => {
    const ruleTester = new RuleTester();
    ruleTester.run(
      `Types without members, 'any' and 'never' should not be used in type intersections`,
      rule,
      {
        valid: [
          {
            code: `function twoPrimitives(x: string & number) {}`,
          },
          {
            code: `function twoInterfaces(x: { a: string } & { b: number }) {}`,
          },
          {
            code: `
      interface WithString {
        a: string;
      }
      interface NotEmpty extends WithString {}
      function withNotEmptyInterface(x: { a: string } & NotEmpty) {}
      `,
          },
          {
            code: `
        const propName = 'prop-name';
        
        interface MyInterface {
          [propName]: string;
        }
        
        interface MyOtherInterface {
          prop: string;
        }
        
        type MyType = MyOtherInterface & MyInterface;
        `,
          },
          {
            code: `
         export namespace TestCaseParser {
          export interface CompilerSettings {
              [name: string]: string;
          }
         }
         
           interface HarnessOptions {
            useCaseSensitiveFileNames?: boolean;
            includeBuiltFile?: string;
            baselineFile?: string;
            libFiles?: string;
        }
        
        let  harnessSettings: TestCaseParser.CompilerSettings & HarnessOptions;
 
        `,
          },
          {
            code: `
         export namespace TestCaseParser {
          export interface CompilerSettings {
              [name: number]: string;
          }
         }
         
           interface HarnessOptions {
            useCaseSensitiveFileNames?: boolean;
            includeBuiltFile?: string;
            baselineFile?: string;
            libFiles?: string;
        }
        
        let  harnessSettings: TestCaseParser.CompilerSettings & HarnessOptions;

        `,
          },
          // False positive tests: LiteralUnion pattern for autocomplete preservation
          {
            // Pattern: (string & {}) in union with string literal types
            // This is a documented TypeScript idiom that preserves IDE autocomplete
            // for the literal types while still accepting any string value.
            code: `type Size = 'small' | 'medium' | 'large' | (string & {});`,
          },
          {
            // Pattern: (number & {}) in union with number literal types
            // Similar to the string pattern, this preserves autocomplete
            // for specific numeric values while accepting any number.
            code: `type Spacing = 0 | 4 | 8 | 16 | 32 | (number & {});`,
          },
          {
            // Pattern: (string & {}) with keyof expression in union
            // Allows specific known keys to have autocomplete while accepting any string.
            code: `
interface ThemeColors {
  primary: string;
  secondary: string;
  error: string;
}

type ColorKey = keyof ThemeColors | (string & {});`,
          },
          {
            // Pattern: Generic LiteralUnion type using (U & {})
            // This is the canonical "LiteralUnion" pattern documented in TypeScript
            // community resources. See: https://github.com/Microsoft/TypeScript/issues/29729
            code: `
export type LiteralUnion<T extends U, U> = T | (U & {});

// Usage: autocomplete suggests 'small' | 'medium' | 'large' but accepts any string
type Size = LiteralUnion<'small' | 'medium' | 'large', string>;`,
          },
          {
            // Real-world example from Angular: RequestCache | (string & {})
            // Used in HTTP request options to allow known cache modes with autocomplete
            // while accepting custom string values.
            code: `
interface HttpResourceRequestOptions {
  cache?: RequestCache | (string & {});
  credentials?: RequestCredentials | (string & {});
  priority?: RequestPriority | (string & {});
}`,
          },
          // False positive tests: Generic type manipulation patterns with & {}
          {
            // Simplify/Prettify mapped type pattern: { [K in keyof T]: T[K] } & {}
            // The & {} forces TypeScript to flatten/simplify complex type representations.
            // This is a well-known TypeScript idiom used in libraries like Kibana.
            // See: https://github.com/microsoft/TypeScript/issues/29729
            code: `
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

interface ComplexType {
  prop1: string;
  nested: {
    value: number;
  };
}

type Simplified = Simplify<ComplexType>;`,
          },
          {
            // Generic type reference with type arguments intersected with {}
            // Used for type normalization in complex generic type expressions.
            // Real-world example pattern from TanStack Router.
            code: `
interface SomeProps<T> { value: T; }
type ExtendedProps<T> = SomeProps<T> & {};`,
          },
          {
            // Generic type reference in interface property position
            // Pattern from TanStack Router: params: ParamsReducer<TRouter, TFrom, TTo> & {}
            code: `
interface AnyRouter {
  routes: unknown;
}

type ParamsReducer<TRouter extends AnyRouter, TFrom, TTo> = {
  router: TRouter;
  from: TFrom;
  to: TTo;
};

interface MakeRequiredPathParams<TRouter extends AnyRouter, TFrom, TTo> {
  params: ParamsReducer<TRouter, TFrom, TTo> & {};
}`,
          },
          {
            // Reversed order: {} & GenericType pattern
            // Used for non-nullability constraints in generic type definitions.
            // Real-world example from apollo-client DeepPartial.ts.
            code: `
type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

type DeepPartialSet<T> = {} & Set<DeepPartial<T>>;
type DeepPartialReadonlySet<T> = {} & ReadonlySet<DeepPartial<T>>;
type DeepPartialMap<K, V> = {} & Map<DeepPartial<K>, DeepPartial<V>>;`,
          },
          {
            // Bare type parameter intersected with {}
            // T & {} filters out null/undefined from T, a common generic constraint pattern.
            code: `type NonNullish<T> = T & {};`,
          },
        ],
        invalid: [
          {
            code: `function withNull(x: number & null) {}`,
            errors: [
              {
                message: 'Remove this type without members or change this type intersection.',
                line: 1,
                column: 31,
                endLine: 1,
                endColumn: 35,
              },
            ],
          },
          {
            code: `function withAny(x: any & { a: string }) {}`,
            errors: [{ message: `Simplify this intersection as it always has type "any".` }],
          },
          {
            code: `function withNever(x: boolean & never) {}`,
            errors: [{ message: `Simplify this intersection as it always has type "never".` }],
          },
          {
            code: `function withUndefined(x: { a: string } & undefined) {}`,
            errors: 1,
          },
          {
            code: `function withVoid(x: string & void) {}`,
            errors: 1,
          },
          {
            code: `function triple(x: null & string & undefined) {}`,
            errors: 2,
          },
          {
            code: `
      function declarations() {
        let x: string & null;
      }
      `,
            errors: 1,
          },
          {
            code: `function withEmptyObjectLiteral(x: { a: string } & {}) {}`,
            errors: 1,
          },
          {
            code: `
        interface Empty {}
        function withEmptyInterface(x: { a: string } & Empty) {}
        `,
            errors: 1,
          },
          {
            // (string & {}) outside of a union should still be flagged
            // The LiteralUnion exception only applies when used within a union type
            code: `type Invalid = string & {};`,
            errors: 1,
          },
          {
            // (number & {}) outside of a union should still be flagged
            code: `type AlsoInvalid = number & {};`,
            errors: 1,
          },
        ],
      },
    );
  });
});
