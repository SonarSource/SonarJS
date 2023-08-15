/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { rule } from './';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2018, sourceType: 'module' },
});

ruleTester.run(`Decorated rule should provide suggestion`, rule, {
  valid: [
    {
      code: `import "foo"; import "bar";`,
    },
  ],
  invalid: [
    {
      code: `import "foo"; import "foo"`,
      errors: [
        {
          suggestions: [
            {
              desc: 'Merge this import into the first import from "foo"',
              output: `import "foo";`,
            },
          ],
        },
      ],
    },
    {
      code: `import "foo"; import "bar"; import "foo";`,
      errors: [{ suggestions: [{ output: `import "foo"; import "bar";` }] }],
    },
    {
      code: `import { f as ff } from "foo"; import { g } from "foo";`,
      errors: [{ suggestions: [{ output: `import { f as ff, g } from "foo";` }] }],
    },
    {
      code: `import { a, c } from "foo"; import { b, d } from "foo";`,
      errors: [{ suggestions: [{ output: `import { a, c, b, d } from "foo";` }] }],
    },
    {
      code: `import { a } from "foo"; import { b } from "foo"; import { c } from "foo";`,
      errors: [
        { suggestions: [{ output: `import { a, b } from "foo"; import { c } from "foo";` }] },
        { suggestions: [{ output: `import { a, c } from "foo"; import { b } from "foo";` }] },
      ],
    },
    {
      code: `import * as f from "foo"; import g from "foo";`,
      errors: [{ suggestions: [{ output: `import g, * as f from "foo";` }] }],
    },
    {
      code: `import f from "foo"; import * as g from "foo";`,
      errors: [{ suggestions: [{ output: `import f, * as g from "foo";` }] }],
    },
    {
      code: `
import f from "foo";
// comment
import { g, h } from "foo";
import "bar";`,
      errors: [
        {
          suggestions: [
            {
              output: `
import f, { g, h } from "foo";
// comment
import "bar";`,
            },
          ],
        },
      ],
    },
    {
      code: `
import f from "foo";
import {
  g,
  h
} from "foo";`,
      errors: [
        {
          suggestions: [
            {
              output: `
import f, {
  g,
  h
} from "foo";`,
            },
          ],
        },
      ],
    },
    {
      code: `
import {
  f,
  g
} from "foo";
import h from "foo";`,
      errors: [
        {
          suggestions: [
            {
              output: `
import h, {
  f,
  g
} from "foo";`,
            },
          ],
        },
      ],
    },
    {
      code: `
import {
  f,
  g
} from "foo";
import {
  h,
  i
} from "foo";`,
      errors: [
        {
          suggestions: [
            {
              output: `
import {
  f,
  g,
  h,
  i
} from "foo";`,
            },
          ],
        },
      ],
    },
    {
      code: `import type { F } from "foo"; import type { G } from "foo";`,
      errors: [{ suggestions: [{ output: `import type { F, G } from "foo";` }] }],
    },
    {
      code: `
      declare module 'Foo' {
        import type { T } from 'baz';
      }

      declare module 'Bar' {
        import type { U } from 'baz';
      }`,
      errors: [{ suggestions: [] }],
    },
    {
      code: `
      import type { T } from 'baz';
      declare module 'Bar' {
        import type { U } from 'baz';
      }`,
      errors: [
        {
          suggestions: [
            {
              output: `
      import type { T, U } from 'baz';
      declare module 'Bar' {
      }`,
            },
          ],
        },
      ],
    },
  ],
});
