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
import { rule } from './index.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S3358', () => {
  it('S3358', () => {
    const ruleTester = new DefaultParserRuleTester();
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
  });
});
