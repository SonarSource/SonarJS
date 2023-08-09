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
import { rule } from '../../src/rules/conditional-indentation';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });

ruleTester.run(`A conditionally executed single line should be denoted by indentation`, rule, {
  valid: [
    {
      code: `
        if (x > 0)
            doTheThing();
        doTheOtherThing();`,
    },
    {
      code: `
        while (x <= 10)
            doTheThing();
        doTheOtherThing();

        while (x <= 10) {
        doTheThing();
        doTheOtherThing();
        }`,
    },
    {
      code: `
        if (x == 5)
            doTheThing();
        else if (x == 6)
            doTheThing();
        else
            doTheThing();`,
    },
    {
      code: `
            if (x > 0) {
            doTheThing();
            doTheOtherThing();
            }
          
            if (x > 0)
            {
            doTheThing();
            doTheOtherThing();
            }`,
    },
    {
      code: `
            for (x in arr)
                doTheThing();
            doTheOtherThing();

            for (x in arr)  {
            doTheThing();
            doTheOtherThing();
            }`,
    },
    {
      code: `
      if (something) {
        //... some logic
        doSomething();
      } else
        doSomethingElse();`,
    },
  ],
  invalid: [
    {
      code: `
        if (x > 0)  // Noncompliant [[ID=ID1]] {{}}
        doTheThing();
        doTheOtherThing();
      `,
      errors: [
        {
          message: `{\"message\":\"Use curly braces or indentation to denote the code conditionally executed by this \\\"if\\\".\",\"secondaryLocations\":[{\"column\":8,\"line\":3,\"endColumn\":18,\"endLine\":3}]}`,
          line: 2,
          column: 9,
          endLine: 2,
          endColumn: 11,
        },
      ],
    },
    {
      code: `
        if (cond) {
        } else // Noncompliant
        foo();
        `,
      errors: [
        {
          message: `{\"message\":\"Use curly braces or indentation to denote the code conditionally executed by this \\\"else\\\".\",\"secondaryLocations\":[{\"column\":8,\"line\":4,\"endColumn\":11,\"endLine\":4}]}`,
          line: 3,
          column: 11,
          endLine: 3,
          endColumn: 15,
        },
      ],
    },
    {
      code: `
          while (x <= 10) // Noncompliant
          doTheThing();
          doTheOtherThing();
          `,
      errors: [
        {
          message: `{\"message\":\"Use curly braces or indentation to denote the code conditionally executed by this \\\"while\\\".\",\"secondaryLocations\":[{\"column\":10,\"line\":3,\"endColumn\":20,\"endLine\":3}]}`,
          line: 2,
          column: 11,
          endLine: 2,
          endColumn: 16,
        },
      ],
    },
    {
      code: `
          for (x in arr) // Noncompliant
          doTheThing();
          doTheOtherThing();`,
      errors: [
        {
          message: `{\"message\":\"Use curly braces or indentation to denote the code conditionally executed by this \\\"for\\\".\",\"secondaryLocations\":[{\"column\":10,\"line\":3,\"endColumn\":20,\"endLine\":3}]}`,
          line: 2,
          column: 11,
          endLine: 2,
          endColumn: 14,
        },
      ],
    },
    {
      code: `
          if (x == 5) // Noncompliant
          doTheThing();
          else if (x == 6) // Noncompliant
          doTheThing();
          else // Noncompliant
          doTheThing();
            `,
      errors: 3,
    },
    {
      code: `
          for (x = 1; x <= 10; x++) // Noncompliant, only one error at line 2
          doTheThing();
          doTheOtherThing();
          for (x = 1; x <= 10; x++)
              doTheThing();
          doTheOtherThing();
          for (x = 1; x <= 10; x++) {
              doTheThing();
              doTheOtherThing();
          }`,
      errors: [
        {
          line: 2,
        },
      ],
    },
    {
      code: `
          if (cond) // Noncompliant, negative indentation
      foo();`,
      errors: 1,
    },
  ],
});
