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
import { ruleTester } from '../rule-tester';
import rule = require('../../src/rules/no-duplicate-string');

ruleTester.run('no-duplicate-string', rule, {
  valid: [
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
    import * as name1 from "module-name-long";
    import * as name2 from "module-name-long";
    import * as name3 from "module-name-long";
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
      options: [{ threshold: 2, ignoreStrings: 'Hello world!' }, 'sonar-runtime'],
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
          messageId: 'defineConstant',
          data: {
            times: 3,
          },
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
              secondaryLocations: [
                {
                  line: 3,
                  column: 16,
                  endLine: 3,
                  endColumn: 30,
                  message: 'Duplication',
                },
              ],
              message: 'Define a constant instead of duplicating this literal 2 times.',
            }),
          },
          line: 2,
          endLine: 2,
          column: 17,
          endColumn: 31,
        },
      ],
      options: [{ threshold: 2 }, 'sonar-runtime'],
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
          messageId: 'defineConstant',
          data: {
            times: 3,
          },
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
          messageId: 'defineConstant',
          data: {
            times: 2,
          },
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
          messageId: 'defineConstant',
          data: {
            times: 3,
          },
          line: 3,
        },
      ],
    },
  ],
});
