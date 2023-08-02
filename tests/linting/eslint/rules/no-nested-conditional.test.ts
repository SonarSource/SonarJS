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
import { rule } from '@sonar/jsts/rules/no-nested-conditional';

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2018, ecmaFeatures: { jsx: true } },
});
ruleTester.run('Ternary operators should not be nested', rule, {
  valid: [
    {
      code: `var a = condition ? 1 : 2; // OK`,
    },
    {
      code: `
      var foo = condition
        ? bar
        : function() {
            function g() {
              return condition2 ? 1 : 2 // OK, nesting is broken by function declaration
            }
            return g;
        }`,
    },
    {
      code: `
      var a = condition
        ? 1
        : (function() {
          return condition2 ? 1 : 2; // OK, nesting is broken by function expression
        })();`,
    },
    {
      code: `
      var foo = condition
        ? bar
        : (x => condition2 ? 1 : 2); // OK, nesting is broken by arrow function`,
    },
    {
      code: `
      var foo = condition
        ? bar
        : function* gen() {
          yield condition2 ? 1 : 2  // OK, nesting is broken by generator
        }`,
    },
    {
      code: `
      var obj = condition
        ? {
          a: 1,
          b: 2
        }
        : {
          a: 1,
          b: condition2 ? 1 : 2 // OK, nesting is broken by object literal
        }`,
    },
    {
      code: `
      var arr = condition
      ? [1, 2]
      : [1, condition2 ? 1 : 2]  // OK, nesting is broken by array literal`,
    },
    {
      code: `
        function Component(isLoading, isEditing) {
          const [saving, setSaving] = useState(false);
          return (
            <>
              {isLoading ? (
                <Loader active />
              ) : (
                <Section label={isEditing ? 'Editing is open' : 'Editing is not open'}>
                  <a>{isEditing ? 'Close now' : 'Start now'}</a>
                  <Checkbox onClick={!saving ? setSaving(saving => !saving) : null} />
                </Section>
              )}
            </>
          );
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
      // nested on the true side
      var a = condition ? 1 : (condition2 ? 1 : 2);`,
      errors: [
        {
          message: 'Extract this nested ternary operation into an independent statement.',
          line: 3,
          column: 32,
          endLine: 3,
          endColumn: 50,
        },
      ],
    },
    {
      code: `
      // nested on the false side
      var a = condition ? 1 : (condition2 ? 1 : 2);`,
      errors: 1,
    },
    {
      code: `
      // nested on both sides
      var a = condition 
        ? (condition2 ? 1 : 2)
        : (condition3 ? 1 : 2);`,
      errors: 2,
    },
    {
      code: `
      // nested and re-nested
      var a = condition
        ? 1
        : (condition2
            ? 1
            : (condition3 ? 1 : 2));`,
      errors: 2,
    },
    {
      code: `
      var a = condition
        ? 1
        : foo("hello", condition2 ? 1 : 2);`,
      errors: 1,
    },
  ],
});
