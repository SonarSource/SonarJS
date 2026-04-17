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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1533', () => {
  it('S1533', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('Wrapper objects should not be used for primitive types', rule, {
      valid: [
        {
          code: `
        // not primitive wrapper constructors
        x = new Array();
        x = new MyObject();
        x = new Foo.MyObject();
        x = new MyObject;

        // OK without "new"
        x = Boolean(y);
        x = Number(y);
        x = String(y);

        let a: string;
        let b: number | string | boolean | Array;
        const c: number = 3;

        function myFunction(param1: boolean, param2: string): boolean { return true; }`,
        },
        {
          // FP: wrapper types in interface property declarations (TSInterfaceBody context)
          code: `interface IProps { disabled?: Boolean; label: String; count: Number; }`,
        },
        {
          // FP: wrapper type in interface method parameter (TSInterfaceBody context)
          code: `interface IApi { close(key: String): void; }`,
        },
        {
          // FP: wrapper types in type alias object literal (TSTypeAliasDeclaration context)
          code: `type Config = { size?: Number; origin?: Number; };`,
        },
        {
          // FP: wrapper type as direct type alias value (TSTypeAliasDeclaration context)
          code: `type T = Boolean;`,
        },
        {
          // FP: local aliases containing wrapper types stay exempt at their definition sites
          code: `type Alias = String; type WrappedBox = Array<Alias>;`,
        },
        {
          // FP: local interfaces containing wrapper types stay exempt at their definition sites
          code: `interface CardArtItem { classes: Array<String>; }`,
        },
        {
          // FP: wrapper type in generic type parameter in interface (TSInterfaceBody ancestor)
          code: `interface ICardArt { classes: Array<String>; }`,
        },
        {
          // FP: wrapper type in interface property with function type (TSInterfaceBody context)
          code: `interface Props { onChange: (value: String) => void; onCountChange: (count: Number) => void; }`,
        },
        {
          // FP: wrapper type as generic arg in call expression (type annotation only, not a runtime value)
          code: `declare function createMap<T>(): Map<T>; const x = createMap<String>();`,
        },
        {
          // FP: wrapper types as generic args in new expression (type annotation only, not a runtime value)
          code: `const m = new Map<Number, String>();`,
        },
        {
          // FP: later uses of local aliases stay exempt
          code: `type T = String; let x: T; let y: Map<T, T>;`,
        },
        {
          // FP: later uses of local interfaces stay exempt
          code: `interface CardArtItem { classes: Array<String>; } class CardArt extends React.Component<{ layers: Array<CardArtItem> }, {}> {}`,
        },
        {
          // FP: local interfaces used as function parameters stay exempt
          code: `interface FilterRestProps { confirm?: Boolean; closeDropdown?: Boolean; } const onReset = ({ confirm }: FilterRestProps = { confirm: false }) => confirm;`,
        },
        {
          // FP: transitive local aliases stay exempt
          code: `type IconProps = { disabled?: Boolean }; type IconComponent = JSXComponent<IconProps>; type IconInstance = { component: IconComponent }; const iconData: Ref<IconInstance> | undefined = undefined;`,
        },
      ],
      invalid: [
        {
          code: `x = new Number;`,
          errors: [
            {
              message: 'Remove this use of "Number" constructor.',
              line: 1,
              endLine: 1,
              column: 5,
              endColumn: 15,
              suggestions: [
                {
                  output: 'x = Number;',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `x = new Number(y);`,
          errors: [
            {
              message: 'Remove this use of "Number" constructor.',
              line: 1,
              endLine: 1,
              column: 5,
              endColumn: 18,
              suggestions: [
                {
                  output: 'x = Number(y);',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `x = new String("str");`,
          errors: [
            {
              message: 'Remove this use of "String" constructor.',
              line: 1,
              endLine: 1,
              column: 5,
              endColumn: 22,
              suggestions: [
                {
                  output: 'x = String("str");',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `x = new String("str", 42);`,
          errors: [
            {
              message: 'Remove this use of "String" constructor.',
              line: 1,
              endLine: 1,
              column: 5,
              endColumn: 26,
              suggestions: [
                {
                  output: 'x = String("str", 42);',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `let y: number | Boolean | string;`,
          errors: [
            {
              message: 'Replace this "Boolean" wrapper object with primitive type "boolean".',
              line: 1,
              endLine: 1,
              column: 17,
              endColumn: 24,
              suggestions: [
                {
                  output: 'let y: number | boolean | string;',
                  desc: 'Replace "Boolean" with "boolean"',
                },
              ],
            },
          ],
        },
        {
          code: `function myFunction(param1: boolean, param2: String): Number { return true; }`,
          errors: [
            {
              message: 'Replace this "String" wrapper object with primitive type "string".',
              line: 1,
              endLine: 1,
              column: 46,
              endColumn: 52,
              suggestions: [
                {
                  output:
                    'function myFunction(param1: boolean, param2: string): Number { return true; }',
                  desc: 'Replace "String" with "string"',
                },
              ],
            },
            {
              message: 'Replace this "Number" wrapper object with primitive type "number".',
              line: 1,
              endLine: 1,
              column: 55,
              endColumn: 61,
              suggestions: [
                {
                  output:
                    'function myFunction(param1: boolean, param2: String): number { return true; }',
                  desc: 'Replace "Number" with "number"',
                },
              ],
            },
          ],
        },
        {
          code: `x = new Boolean(true);`,
          errors: [
            {
              message: 'Remove this use of "Boolean" constructor.',
              suggestions: [
                {
                  output: 'x = Boolean(true);',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `x = new Boolean(false);`,
          errors: [
            {
              message: 'Remove this use of "Boolean" constructor.',
              suggestions: [
                {
                  output: 'x = Boolean(false);',
                  desc: 'Remove "new" operator',
                },
              ],
            },
          ],
        },
        {
          code: `let y: String;`,
          errors: [
            {
              message: 'Replace this "String" wrapper object with primitive type "string".',
              suggestions: [
                {
                  output: 'let y: string;',
                  desc: 'Replace "String" with "string"',
                },
              ],
            },
          ],
        },
        {
          code: `
        x = new Number(true);
        x = new Number(false);
        x = new Number(0);`,
          errors: 3,
        },
        {
          code: `
        x = new String(y);
        x = new String(42);
        x = new String();
        x = new String("");`,
          errors: 4,
        },
        {
          code: `x = new Number(true);`,
          errors: [
            {
              message: 'Remove this use of "Number" constructor.',
              suggestions: [
                {
                  desc: 'Remove "new" operator',
                  output: 'x = Number(true);',
                },
              ],
            },
          ],
        },
        {
          code: `function foo(): Number {}`,
          errors: [
            {
              messageId: 'replaceWrapper',
              suggestions: [
                {
                  desc: 'Replace "Number" with "number"',
                  output: 'function foo(): number {}',
                },
              ],
            },
          ],
        },
        {
          code: `let x: Array<String>;`,
          errors: [
            {
              message: 'Replace this "String" wrapper object with primitive type "string".',
              suggestions: [
                {
                  output: 'let x: Array<string>;',
                  desc: 'Replace "String" with "string"',
                },
              ],
            },
          ],
        },
        {
          // TP: wrapper type in constructor parameter (class body is not a type-definition context)
          code: `class Foo { constructor(id: String, count: Number) {} }`,
          errors: 2,
        },
        {
          // TP: wrapper type as generic arg in function parameter type annotation (not a type-definition context)
          code: `function foo(x: Map<String>): void {}`,
          errors: 1,
        },
        {
          // TP: wrapper type in arrow function parameter (arrow function is not a type-definition context)
          code: `const onChange = (value: Number) => value;`,
          errors: 1,
        },
        {
          // TP: Boolean as function return type (not a type-definition context)
          code: `function isValid(x: any): Boolean { return !!x; }`,
          errors: 1,
        },
        {
          // TP: wrapper type in union type as function parameter (not a type-definition context)
          code: `function setKey(key: string | String, value: number): void {}`,
          errors: 1,
        },
        {
          // TP: wrapper type in union type as class method parameter (class body is not a type-definition context)
          code: `class ColumnController { setColumnVisible(key: Column | ColDef | String, visible: boolean): void {} }`,
          errors: 1,
        },
        {
          // TP: wrapper type in union type inside array type annotation as class method parameter
          // (array-of-union is the dominant pattern in real-world ruling data)
          code: `class ColumnController { setColumnsVisible(keys: (Column | ColDef | String)[], visible: boolean): void {} }`,
          errors: 1,
        },
        {
          // TP: wrapper type in class property arrow function parameter (class body is not a type-definition context)
          code: `class Component { private onValueChanged = (value: Number) => { this.handleChange(value); } }`,
          errors: 1,
        },
        {
          // TP: wrapper type in inline object type literal on variable declaration (not a type-definition context)
          code: `let x: { count: Boolean };`,
          errors: 1,
        },
        {
          // TP: wrapper type in inline object type literal as function return type (not a type-definition context)
          code: `function foo(): { label: String } {}`,
          errors: 1,
        },
        {
          // TP: wrapper type in forEach callback arrow function parameter (callback is not a type-definition context)
          code: `keys.forEach((key: Column | ColDef | String) => { console.log(key); });`,
          errors: 1,
        },
      ],
    });
  });
});
