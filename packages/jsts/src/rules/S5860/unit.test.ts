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
import { rule } from './';
import { RuleTester } from 'eslint';
import { JavaScriptRuleTester } from '../../../tests/tools';

const typeAwareRuleTester = new JavaScriptRuleTester();
typeAwareRuleTester.run('Regular expressions named groups should be used', rule, {
  valid: [
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = 'str'.matchAll(pattern);
        if (matched) {
          matched.groups.foo;
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groups.foo;
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)(?<baz>\\w)/;
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groups.foo;
          matched.groups.bar;
          matched.groups.baz;
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = pattern.exec('str');
        if (matched) {
          matched.indices.groups.foo;
        }
      `,
    },
    {
      code: `
        const pattern = 12345;
        const matched = 'str'.matchAll(pattern);
        if (matched) {
          matched.groups.foo;
        }
      `,
    },
    {
      code: `
        const matched = 'str'.matchAll(unknownPattern);
        if (matched) {
          matched.groups.foo;
        }
      `,
    },
    {
      code: `
        const matched = 'str'.matchAll(/(?<foo>\\w)/);
        if (matched) {
          matched.groups!.foo;
        }
      `,
    },
    {
      code: `
        function foo(unknownPattern) {
          const matched = 'str'.matchAll(unknownPattern);
          if (matched) {
            matched.groups.foo;
          }
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const result = 'str'.replace(pattern, '$<foo>');
      `,
    },
    {
      code: `
        const result = 'str'.replace(unknownPattern, '$<foo>');
      `,
    },
    {
      code: `/(?<foo>\\w)/ // unused 'foo': ignored because pattern never matched`,
    },
    {
      code: `RegExp('(?<foo>\\w)') // unused 'foo': ignored because pattern never matched`,
    },
    {
      code: `new RegExp('(?<foo>\\w)') // unused 'foo': ignored because pattern never matched`,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // unused 'foo': ignored because pattern never matched
        const matched = 'str'.matchAll(/* missing pattern */);
        if (matched) {
          matched.groups.foo;
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // unused 'foo': ignored because pattern never
        const matched = match(pattern); // not 'String.prototype.match' method call
        if (matched) {
          matched.groups.foo;
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // unused 'foo': ignored because pattern never matched
        const found = pattern.test('str'); // using 'RegExp.prototype.test'
        if (found) {
          /* ... */
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/; // unused 'foo': ignored because pattern never matched
        const result = 'str'.replace(pattern, '$<bar> $<baz>');
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // unused 'foo': ignored because undeclared pattern
        undeclaredMatch = 'str'.match(pattern);
        if (matched) {
          undeclaredMatch[1];
          undeclaredMatch.groups.foo;
        }
      `,
    },
    {
      code: `
        let pattern;
        pattern = pattern;
        const matched = 'str'.matchAll(pattern);
      `,
    },
    {
      code: `
        let pattern1, pattern2, pattern3;
        pattern1 = pattern3;
        pattern2 = pattern1;
        pattern3 = pattern2;
        const matched = 'str'.matchAll(pattern3);
      `,
    },
    {
      code: `
      const pattern = /(?<foo>\\w)(?<bar>\\w)/;
      const matched = 'str'.match(pattern);
      if (matched) {
        const { foo, bar: b } = matched.groups;
      }
      `,
    },
    {
      code: `
      const pattern = /(?<foo>\\w)(?<bar>\\w)/;
      const matched = 'str'.match(pattern);
      if (matched) {
        ({ foo, bar } = matched.groups);
      }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = 'str'.matchAll(pattern);
        if (matched) {
          matched.groups['foo'];
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = pattern.exec('str');
        if (matched) {
          matched.indices.groups['foo'];
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = 'str'.matchAll(pattern);
        if (matched) {
          matched[1]; // Noncompliant: 'foo' referenced by index
          matched[2]; // ignored as it doesn't exist
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
                      // ^^^^^^^^^^^
        const matched = 'str'.match(pattern);
        if (matched) {
          matched[1]; // Noncompliant: 'foo' referenced by index
               // ^
        }
      `,
      errors: [
        {
          message: JSON.stringify({
            message: `Directly use 'foo' instead of its group number.`,
            secondaryLocations: [
              { message: `Group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 6,
          endLine: 6,
          column: 19,
          endColumn: 20,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const FOO_IDX = 1;
        const pattern = /(?<foo>\\w)/;
        const matched = 'str'.match(pattern);
        if (matched) {
          matched[FOO_IDX]; // Noncompliant: 'foo' referenced by index
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(abc)(?<foo>\\w)/;
        const matched = 'str'.match(pattern);
        if (matched) {
          matched[1]; // unnamed capturing group
          matched[2]; // Noncompliant: 'foo' referenced by index
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/; // Noncompliant: unused 'foo'
                      // ^^^^^^^^^^^
                     // ^^^^^^^^^^^^^^^^^^^^^^^^
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groups.bar;
        }
      `,
      errors: [
        {
          message: JSON.stringify({
            message: 'Use the named groups of this regex or remove the names.',
            secondaryLocations: [
              { message: `Named group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 2,
          endLine: 2,
          column: 25,
          endColumn: 47,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // Noncompliant: unused 'foo'
        const matched = 'str'.match(pattern);
        if (matched) {
          matched[UNKNOWN_IDX];
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // Noncompliant: unused 'foo'
        const matched = 'str'.match(pattern);
        if (matched) {
          matched['non-number index'];
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
                      // ^^^^^^^^^^^
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groups.foo;
          matched.groups.bar; // Noncompliant: 'bar' doesn't exist
                      // ^^^
        }
      `,
      errors: [
        {
          message: JSON.stringify({
            message: `There is no group named 'bar' in the regular expression.`,
            secondaryLocations: [
              { message: `Named group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 7,
          endLine: 7,
          column: 26,
          endColumn: 29,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)(?<baz>\\w)/; // Noncompliant: unused 'foo', 'baz'
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groups.bar;
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // Noncompliant: unused 'foo'
        const matched = pattern.exec('str');
        if (matched) {
          matched[groups].foo;
          matched.groups[foo];
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // Noncompliant: unused 'foo'
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groupz.foo; // Intentional typo 'groupz'
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // Noncompliant: unused 'foo'
        const matched = pattern.exec('str');
        if (matched) {
          matched.indices.groupz.foo; // Intentional typo 'groupz'
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        const matched = pattern.exec('str');
        if (matched) {
          matched[1]; // Noncompliant: 'foo' referenced by index
          matched[2];
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
                      // ^^^^^^^^^^^
        const matched = pattern.exec('str');
        if (matched) {
          matched.indices.groups.foo;
          matched.indices.groups.bar; // Noncompliant: 'bar' doesn't exist
                              // ^^^
        }
      `,
      errors: [
        {
          message: JSON.stringify({
            message: `There is no group named 'bar' in the regular expression.`,
            secondaryLocations: [
              { message: `Named group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 7,
          endLine: 7,
          column: 34,
          endColumn: 37,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/; // Noncompliant: unused 'foo'
        const matched = pattern.exec('str');
        if (matched) {
          matched[indices].groups.foo;
          matched.indices[groups].foo;
          matched.indices.groups[foo];
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/;
        const result = 'str'.replace(pattern, '$2 $3'); // Noncompliant: 'foo' referenced by index
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
                      // ^^^^^^^^^^
        const result = 'str'.replace(pattern, '$1'); // Noncompliant: 'foo' referenced by index
                                           // ^^^^
      `,
      errors: [
        {
          message: JSON.stringify({
            message: 'Directly use the group names instead of their numbers.',
            secondaryLocations: [
              { message: `Group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 4,
          endLine: 4,
          column: 47,
          endColumn: 51,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/;
        let declaredMatch;
        declaredMatch = 'str'.match(pattern);
        if (matched) {
          declaredMatch[1]; // Noncompliant: 'foo' referenced by index
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = '(?<foo>\\w)(?<bar>\\w)(?<baz>\\w)'; // Noncompliant: unused 'baz'
        const matched = 'str'.match(pattern);
        if (matched) {
          matched[1]; // Noncompliant: 'foo' referenced by index
          matched.indices.groups.bar;
          matched.indices.groups.qux; // Noncompliant: 'qux' doesn't exist
        }
      `,
      errors: 3,
    },
    {
      code: `
        /(?<foo>\\w)\\1(?<bar>\\w)\\k<bar>(?<baz>\\w)/; // Noncompliant: 'foo' referenced by index
                 // ^^^
      // ^^^^^^^^^^^
      `,
      errors: [
        {
          message: JSON.stringify({
            message: `Directly use 'foo' instead of its group number.`,
            secondaryLocations: [
              { message: `Group 'foo'`, column: 9, line: 2, endColumn: 19, endLine: 2 },
            ],
          }),
          line: 2,
          endLine: 2,
          column: 20,
          endColumn: 22,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `'str'.search('(?<foo>\\w)\\\\1(?<bar>\\w)\\\\k<bar>(?<baz>\\w)'); // Noncompliant: 'foo' referenced by index`,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/; // Noncompliant: unused 'foo'
                        // ^^^^^^^^^^^
                     // ^^^^^^^^^^^^^^^^^^^^^^^^
        const matched = 'str'.match(pattern);
        if (matched) {
          const { bar } = matched.groups;
        }
      `,
      errors: [
        {
          message: JSON.stringify({
            message: 'Use the named groups of this regex or remove the names.',
            secondaryLocations: [
              { message: `Named group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 2,
          endLine: 2,
          column: 25,
          endColumn: 47,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/; // Noncompliant: unused 'foo'
                        // ^^^^^^^^^^^
                     // ^^^^^^^^^^^^^^^^^^^^^^^^
        const matched = 'str'.match(pattern);
        if (matched) {
          ({ bar } = matched.groups);
        }
      `,
      errors: [
        {
          message: JSON.stringify({
            message: 'Use the named groups of this regex or remove the names.',
            secondaryLocations: [
              { message: `Named group 'foo'`, column: 25, line: 2, endColumn: 35, endLine: 2 },
            ],
          }),
          line: 2,
          endLine: 2,
          column: 25,
          endColumn: 47,
        },
      ],
      options: ['sonar-runtime'],
    },
    {
      code: `
      const pattern = /(?<foo>\\w)(?<bar>\\w)/; // Noncompliant: unused 'foo', 'bar'
      const matched = 'str'.match(pattern);
      if (matched) {
        ({ [abc]: def, ...hij} = matched.groups);
      }
      `,
      errors: 2,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/; // Noncompliant: unused 'foo'
        const matched = 'str'.match(pattern);
        if (matched) {
          matched.groups['bar'];
        }
      `,
      errors: 1,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)(?<bar>\\w)/; // Noncompliant: unused 'foo'
        const matched = pattern.exec('str');
        if (matched) {
          matched.indices.groups['bar'];
        }
      `,
      errors: 1,
    },
  ],
});

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('"unused-named-groups" reports nothing without types', rule, {
  valid: [
    {
      code: `
        const pattern = /(?<foo>\\w)/
        const matched = 'str'.matchAll(pattern);
        if (matched) {
          matched[1];
          matched.groups.foo;
          matched.groups.bar;
        }
      `,
    },
    {
      code: `
        const pattern = /(?<foo>\\w)/
        const matched = pattern.exec('str');
        if (matched) {
          matched[1];
          matched.indices.groups.foo;
          matched.indices.groups.bar;
        }
      `,
    },
  ],
  invalid: [],
});
