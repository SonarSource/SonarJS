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
import { rules } from '../external/unicorn.js';
import { rule } from './index.js';
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
  RuleTester,
} from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7778', () => {
  it('S7778', () => {
    const noTypeCheckingRuleTester = new DefaultParserRuleTester();
    noTypeCheckingRuleTester.run('Conservative fallback without type information', rule, {
      valid: [],
      invalid: [
        {
          code: `
const items = [];
items.push(1);
items.push(2);
`,
          output: `
const items = [];
items.push(1, 2);
`,
          errors: 1,
        },
        {
          code: `
importScripts('a.js');
importScripts('b.js');
`,
          output: `
importScripts('a.js', 'b.js');
`,
          errors: 1,
        },
      ],
    });

    const ruleTester = new RuleTester();
    ruleTester.run('Combine consecutive method calls', rule, {
      valid: [
        {
          // https://community.sonarsource.com/t/typescript-s7778-incorrectly-reporting-on-methods-that-dont-accept-multiple-arguments/179057
          code: `
class CustomClass {
  push(item: number): void {}
}
const instance = new CustomClass();
instance.push(1);
instance.push(2); // Compliant: not an Array
`,
        },
        {
          code: `
class CustomTokenList {
  add(token: string): void {}
  remove(token: string): void {}
}
class VirtualElement {
  readonly classList = new CustomTokenList();
}
const el = new VirtualElement();
el.classList.add('active');
el.classList.add('visible'); // Compliant: not a DOMTokenList
el.classList.remove('hidden');
el.classList.remove('inactive'); // Compliant: not a DOMTokenList
`,
        },
        {
          code: `
class CustomPusher {
  push(...items: any[]): void {}
}
const pusher = new CustomPusher();
pusher.push(1);
pusher.push(2); // Compliant: not an Array
`,
        },
      ],
      invalid: [
        {
          code: `
const items: number[] = [];
items.push(1);
items.push(2);
`,
          output: `
const items: number[] = [];
items.push(1, 2);
`,
          errors: 1,
        },
        {
          code: `
const element = document.createElement('div');
element.classList.add('foo');
element.classList.add('bar');
`,
          output: `
const element = document.createElement('div');
element.classList.add('foo', 'bar');
`,
          errors: 1,
        },
        {
          code: `
const element = document.createElement('div');
element.classList.remove('foo');
element.classList.remove('bar');
`,
          output: `
const element = document.createElement('div');
element.classList.remove('foo', 'bar');
`,
          errors: 1,
        },
        {
          code: `
const obj = { items: [] };
obj.items.push(1);
obj.items.push(2);
`,
          output: `
const obj = { items: [] };
obj.items.push(1, 2);
`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S7778 upstream canary', () => {
  it('upstream prefer-single-call should still report on custom class with single-arg push', () => {
    // This test uses the upstream unicorn prefer-single-call rule directly,
    // without the SonarJS decorator. It expects the upstream rule to still flag
    // consecutive calls to a custom class push() method that accepts only a single
    // argument — this is the false positive that the S7778 decorator suppresses.
    //
    // If the upstream rule is later improved to use TypeScript type information and
    // suppress reports on non-Array types, this test will fail — that is the signal
    // to remove the SonarJS decorator.
    const upstreamRuleTester = new NoTypeCheckingRuleTester();
    upstreamRuleTester.run('prefer-single-call', rules['prefer-single-call'], {
      valid: [],
      invalid: [
        {
          code: `
class CustomClass { push(item: number): void {} }
const instance = new CustomClass();
instance.push(1);
instance.push(2);
`,
          errors: 1,
        },
      ],
    });
  });
});
