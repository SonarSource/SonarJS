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

describe('S1192', () => {
  it('S1192', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S1192', rule, {
      valid: [
        {
          code: `
const myObject = {
  'my-property': 4,
  myProperty: 5,
};

myObject['my-property'];
myObject['my-property'];
myObject['my-property'];
// fails no-duplicate-string
myObject['my-property'];
`,
        },
        {
          code: `
    console.log("some message");
    console.log("some message");
    console.log('some message');`,
          options: [{ threshold: 4 }],
        },
        {
          code: ` // too small
    console.log("a&b");
    console.log("a&b");
    console.log("a&b");`,
        },
        {
          code: ` // too small when trimmed
    // trimming allows to not raise issue for flowtype whitespaces
    // which are created as literals for some reason
    console.log("           a            ");
    console.log("           a            ");
    console.log("           a            ");`,
        },
        {
          code: ` // numbers
    console.log(12345.67890);
    console.log(12345.67890);
    console.log(12345.67890);`,
        },
        {
          code: `
    console.log("only 2 times");
    console.log("only 2 times");`,
        },
        {
          code: `// no separators
    console.log("stringstring");
    console.log("stringstring");
    console.log("stringstring");
    console.log("stringstring");`,
        },
        {
          code: `// ImportDeclaration
    import defaultExport1 from "module-name-long";
    import defaultExport2 from "module-name-long";
    import defaultExport3 from "module-name-long";
      `,
        },
        {
          code: ` // ImportDeclaration
    import name1 from "module-name-long";
    import name2 from "module-name-long";
    import name3 from "module-name-long";
      `,
        },
        {
          code: ` // ImportDeclaration
    import "module-name-long";
    import "module-name-long";
    import "module-name-long";
      `,
        },
        {
          code: ` // ImportExpression
    import("module-name-long");
    import("module-name-long");
    import("module-name-long");
      `,
        },
        {
          code: `// ExportAllDeclaration
    export * from "module-name-long";
    export * from "module-name-long";
    export * from "module-name-long";
      `,
        },
        {
          code: `// CallExpression 'require'
    const a = require("module-name-long").a;
    const b = require("module-name-long").b;
    const c = require("module-name-long").c;
      `,
        },
        {
          code: `// ExportNamedDeclaration
    export { a } from "module-name-long";
    export { b } from "module-name-long";
    export { c } from "module-name-long";
      `,
        },
        {
          code: ` // JSXAttribute
    <Foo bar="some string"></Foo>;
    <Foo bar="some string"></Foo>;
    <Foo bar="some string"></Foo>;
    <Foo className="some-string"></Foo>;
      `,
        },
        {
          code: `
    console.log(\`some message\`);
    console.log('some message');
    console.log("some message");`,
        },
        {
          code: `
    const obj1 = {
      "some property": 1
    };
    const obj2 = {
      "some property": 1
    };
    const obj3 = {
      "some property": 1
    };`,
        },
        {
          code: `
      'use strict';
      'use strict';
      'use strict';
      `,
        },
        {
          code: `
      let x: 'Hello world';
      function foo(arg: 'Hello world'): 'Hello world' {
        return 'Hello world';
      }
      `,
        },
        {
          code: `
      'application/json';
      'application/json';
      'application/json';;
      `,
        },
        {
          code: `
      console.log('Hello world!');
      console.log('Hello world!');
      console.log('Hello world!');
      `,
          options: [{ threshold: 2, ignoreStrings: 'Hello world!' }],
          settings: { sonarRuntime: true },
        },
      ],
      invalid: [
        {
          code: `
    console.log("some message");
    console.log("some message");
    console.log('some message');`,
          errors: [
            {
              message: 'Define a constant instead of duplicating this literal 3 times.',
              column: 17,
              endColumn: 31,
            },
          ],
        },
        {
          code: `
    console.log("some message");
    console.log('some message');`,
          errors: [
            {
              messageId: 'sonarRuntime',
              data: {
                sonarRuntimeData: JSON.stringify({
                  message: 'Define a constant instead of duplicating this literal 2 times.',
                  secondaryLocations: [
                    {
                      message: 'Duplication',
                      column: 16,
                      line: 3,
                      endColumn: 30,
                      endLine: 3,
                    },
                  ],
                }),
              },
              line: 2,
              endLine: 2,
              column: 17,
              endColumn: 31,
            },
          ],
          options: [{ threshold: 2 }],
          settings: { sonarRuntime: true },
        },
        {
          code: `
    <Foo bar="some string"></Foo>;
    <Foo bar="some string"></Foo>;
    <Foo bar="some string"></Foo>;
    let x = "some-string", y = "some-string", z = "some-string";
      `,
          errors: [
            {
              message: 'Define a constant instead of duplicating this literal 3 times.',
              line: 5,
            },
          ],
        },
        {
          code: `
    console.log("some message");
    console.log('some message');`,
          errors: [
            {
              message: 'Define a constant instead of duplicating this literal 2 times.',
              line: 2,
            },
          ],
          options: [{ threshold: 2 }],
        },
        {
          code: `
    const obj1 = {
      key: "some message"
    };
    const obj2 = {
      key: "some message"
    };
    const obj3 = {
      key: "some message"
    };`,
          errors: [
            {
              message: 'Define a constant instead of duplicating this literal 3 times.',
              line: 3,
            },
          ],
        },
      ],
    });
  });
});
