/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { RuleTester } from 'eslint';
import { rule } from 'rules/unused-import';
import { babelRuleTester } from '../utils/babel-rule-tester';
import * as path from 'path';

const ruleTesterJS = babelRuleTester();

ruleTesterJS.run('Unnecessary imports should be removed', rule, {
  valid: [
    {
      code: `
      import a from 'b';
      console.log(a);
      `,
    },
    {
      code: `
      import { a } from 'b';
      console.log(a);
      `,
    },
    {
      code: `
      import { a, b } from 'c';
      console.log(a);
      console.log(b);
      `,
    },
    {
      code: `
      import { a as b } from 'c';
      console.log(b);
      `,
    },
    {
      code: `import React from 'react';`,
    },
    {
      code: `
      import { a } from 'b';
      <a />
      `,
    },
    {
      code: `
      import type { a } from 'b';
      function f(param: a) {}
      `,
    },
    {
      code: `
      /** @jsx jsx */
      import { jsx } from '@emotion/core'`,
    },
    {
      code: `
      /** @jsx jsx */
      import { jsx } from 'any'`,
    },
  ],
  invalid: [
    {
      code: `import a from 'b';`,
      errors: [
        {
          message: `Remove this unused import of 'a'.`,
          line: 1,
          endLine: 1,
          column: 8,
          endColumn: 9,
        },
      ],
    },
    {
      code: `import { a } from 'b';`,
      errors: 1,
    },
    {
      code: `import { a, b } from 'c';`,
      errors: 2,
    },
    {
      code: `
      import { a, b } from 'c';
      console.log(b);
      `,
      errors: 1,
    },
    {
      code: `import * as a from 'b';`,
      errors: 1,
    },
    {
      code: `import { a as b } from 'c';`,
      errors: 1,
    },
    {
      code: `import typeof a from 'b';`,
      errors: 1,
    },
    {
      code: `import type { a } from 'b';`,
      errors: 1,
    },
    {
      code: `import React, { Component } from 'react';`,
      errors: 1,
    },
    {
      code: `import { jsx } from '@emotion/core'`,
      errors: 1,
    },
  ],
});

const ruleTesterTS = new RuleTester({
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTesterTS.run('Unnecessary imports should be removed', rule, {
  valid: [
    {
      code: `
      import * as Foo from 'foobar';
      let k: Foo;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Foo.Bar;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Foo.Bar.Baz;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Foo<Bar>;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Bar<Foo>;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Foo | Bar;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Foo & Bar;
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      interface I extends Foo {}
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      interface I extends Foo.Bar {}
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      interface I extends Foo<Bar> {}
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      class C implements Foo {}
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      class C implements Foo.Bar {}
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      class C implements Foo<Bar> {}
      `,
    },
    {
      code: `
      import * as Foo from 'foobar';
      class C extends Foo {}
      `,
    },
  ],
  invalid: [
    {
      code: `import * as Foo from 'foobar';`,
      errors: 1,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Bar.Foo;
      `,
      errors: 1,
    },
    {
      code: `
      import * as Foo from 'foobar';
      let k: Baz.Bar.Foo;
      `,
      errors: 1,
    },
    {
      code: `
      import * as Foo from 'foobar';
      interface I extends Bar.Foo {};
      `,
      errors: 1,
    },
    {
      code: `
      import * as Foo from 'foobar';
      class C implements Bar.Foo {};
      `,
      errors: 1,
    },
  ],
});

const ruleTesterJsxFactory = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: path.resolve(`${__dirname}/../fixtures/unused-import/tsconfig.json`),
  },
  parser: require.resolve('@typescript-eslint/parser'),
});

const filename = path.resolve(`${__dirname}/../fixtures/unused-import/sample.lint.tsx`);

ruleTesterJsxFactory.run('Unused imports denoting jsx factory should be ignored', rule, {
  valid: [
    {
      filename,
      code: `
        import { h } from 'some/lib';
        export class Component {
          render() {
            return <div>Hello, world!</div>
          }
        }
      `,
    },
  ],
  invalid: [
    {
      filename,
      code: `
        import { g } from 'some/lib';
        export class Component {
          render() {
            return <div>Hello, world!</div>
          }
        }
      `,
      errors: 1,
    },
    {
      filename,
      code: `
        import { g, h } from 'some/lib';
        export class Component {
          render() {
            return <div>Hello, world!</div>
          }
        }
      `,
      errors: [{ message: `Remove this unused import of 'g'.` }],
    },
  ],
});
