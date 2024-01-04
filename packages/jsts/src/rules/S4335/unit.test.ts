/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { TypeScriptRuleTester } from '../tools';
import { rule } from './';

const ruleTester = new TypeScriptRuleTester();
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
    ],
  },
);
