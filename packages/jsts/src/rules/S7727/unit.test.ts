/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S7727', () => {
  it('should only report when callback has multiple parameters', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('S7727', rule, {
      valid: [
        {
          // Single parameter arrow function - safe
          code: `
            const double = (x: number) => x * 2;
            [1, 2, 3].map(double);
          `,
        },
        {
          // Single parameter function declaration - safe
          code: `
            function square(n: number): number { return n * n; }
            [1, 2, 3].map(square);
          `,
        },
        {
          // Single parameter method reference (MemberExpression) - safe
          code: `
            const utils = { double: (x: number) => x * 2 };
            [1, 2, 3].map(utils.double);
          `,
        },
        {
          // Boolean is explicitly allowed
          code: `[1, 0, 2].filter(Boolean);`,
        },
        {
          // Inline functions are not flagged by the base rule
          code: `[1, 2, 3].map(x => x * 2);`,
        },
        {
          // Non-array .find() - should not be flagged (tree.find(key) is not an array method)
          code: `
            interface Tree<K, V> { find(key: K): { key: K; value: V } | undefined; }
            declare const tree: Tree<number, string>;
            const entry = tree.find(42);
          `,
        },
        {
          // Custom object with .filter() method - not an array
          code: `
            interface Query { filter(predicate: string): Query; }
            declare const query: Query;
            const filtered = query.filter('active');
          `,
        },
      ],
      invalid: [
        {
          // parseInt has 2 parameters (string, radix)
          code: `['1', '2', '3'].map(parseInt);`,
          errors: 1,
        },
        {
          // Custom function with 2 parameters
          code: `
            const addIndex = (value: number, index: number) => value + index;
            [1, 2, 3].map(addIndex);
          `,
          errors: 1,
        },
        {
          // Function declaration with multiple parameters
          code: `
            function processWithIndex(item: number, idx: number): number {
              return item * idx;
            }
            [1, 2, 3].map(processWithIndex);
          `,
          errors: 1,
        },
        {
          // reduce callback with multiple parameters
          code: `
            const reducer = (acc: number, curr: number) => acc + curr;
            [1, 2, 3].reduce(reducer);
          `,
          errors: 1,
        },
        {
          // Method reference (MemberExpression) with 2 parameters
          code: `
            const utils = { process: (x: number, y: number) => x + y };
            [1, 2, 3].map(utils.process);
          `,
          errors: 1,
        },
        {
          // Class constructor - has no call signatures, only construct signatures
          // getCallSignatures() returns empty array, so we report (can't determine)
          code: `
            class MyClass { constructor(public value: number) {} }
            [1, 2, 3].map(MyClass);
          `,
          errors: 1,
        },
      ],
    });
  });
});
