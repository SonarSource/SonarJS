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
import { rule } from './index.js';
import { DefaultParserRuleTester, RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7728', () => {
  it('S7728 without type checking', () => {
    // Without type information, the rule should still report (matches original behavior)
    const noTypeCheckingRuleTester = new DefaultParserRuleTester();

    noTypeCheckingRuleTester.run(`Reports without type information`, rule, {
      valid: [],
      invalid: [
        {
          code: `[1, 2, 3].forEach(x => console.log(x));`,
          errors: 1,
          output: `for (const x of [1, 2, 3]) console.log(x);`,
        },
      ],
    });
  });

  it('S7728 with type checking - reports on iterable types', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('Reports forEach on iterable types', rule, {
      valid: [
        {
          // Custom class with forEach but not iterable - should NOT report
          code: `
class Test {
  private nodes: Element[] = [];
  public forEach(validator: (e: Element) => boolean): void {
    for (const n of this.nodes) {
      if (validator(n)) n.remove();
    }
  }
}
new Test().forEach(() => true);
`,
        },
        {
          // Object with forEach method but not iterable - should NOT report
          code: `
interface CustomCollection {
  forEach(callback: (item: string) => void): void;
}
declare const collection: CustomCollection;
collection.forEach(item => console.log(item));
`,
        },
        {
          // Another non-iterable forEach example
          code: `
type NodeLike = {
  forEach(callback: (node: any) => void): void;
};
declare const nodes: NodeLike;
nodes.forEach(node => process(node));

function process(node: any) {}
`,
        },
      ],
      invalid: [
        {
          // Array - iterable, should report
          code: `
const arr: number[] = [1, 2, 3];
arr.forEach(x => console.log(x));
`,
          output: `
const arr: number[] = [1, 2, 3];
for (const x of arr) console.log(x);
`,
          errors: [{ messageId: 'no-array-for-each/error' }],
        },
        {
          // Set - iterable, should report
          code: `
const set = new Set([1, 2, 3]);
set.forEach(x => console.log(x));
`,
          output: `
const set = new Set([1, 2, 3]);
for (const x of set) console.log(x);
`,
          errors: [{ messageId: 'no-array-for-each/error' }],
        },
        {
          // Map - iterable, should report
          code: `
const map = new Map([['a', 1], ['b', 2]]);
map.forEach((v, k) => console.log(k, v));
`,
          output: `
const map = new Map([['a', 1], ['b', 2]]);
for (const [k, v] of map.entries()) console.log(k, v);
`,
          errors: [{ messageId: 'no-array-for-each/error' }],
        },
        {
          // TypedArray - iterable, should report
          code: `
const typed = new Uint8Array([1, 2, 3]);
typed.forEach(x => console.log(x));
`,
          output: `
const typed = new Uint8Array([1, 2, 3]);
for (const x of typed) console.log(x);
`,
          errors: [{ messageId: 'no-array-for-each/error' }],
        },
      ],
    });
  });
});
