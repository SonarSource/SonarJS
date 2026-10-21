/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S2245', () => {
  it('S2245', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Using pseudorandom number generators (PRNGs) is security-sensitive', rule, {
      valid: [
        {
          code: `class A { shuffle(xs) { return xs.map(() => Math.random()); } }`,
        },
        {
          // anonymous module wrapper must not pull unrelated identifiers of the whole file into scope
          code: `(function () { function tokenize() { var token; } var f = function () { return Math.random(); }; })();`,
        },
        {
          code: `foo(x)`,
        },
        {
          code: `"Math.random()"`,
        },
        {
          code: `Math.foo()`,
        },
        {
          code: `Foo.random()`,
        },
        {
          code: `let x = Math.random();`,
        },
        {
          code: `foo(Math.random())`,
        },
        {
          code: `let random = Math.random; foo(random());`,
        },
        {
          code: `import _ from 'lodash';
export function shuffleCards(cards) { return [...cards].sort(() => Math.random() - 0.5); }`,
        },
        {
          code: `function randomDelayMs() { return Math.floor(Math.random() * 500); }`,
        },
        {
          // 'iv' and 'ecc' must not match as substrings
          code: `function derivePrivateEccentric() { return Math.random(); }`,
        },
        {
          // keyword outside the enclosing function does not count
          code: `function generateToken() {}
function pickColor() { return Math.random(); }`,
        },
      ],
      invalid: [
        {
          code: `class A { generateToken() { return [1].map(() => Math.random()); } }`,
          errors: 1,
        },
        {
          code: `function generatePassword(n) { return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); }`,
          errors: 1,
        },
        {
          code: `function generateToken() { return [...Array(16)].map(() => Math.random().toString(36)[2]).join(''); }`,
          errors: 1,
        },
        {
          code: `const f = () => [1].map(() => Math.random()); const g = { makeSecret() { return [1].map(() => Math.random()); } };`,
          errors: 1,
        },
        {
          code: `const h = require('crypto').createHash('sha256'); foo(Math.random());`,
          errors: 1,
        },
        {
          code: `require('crypto').randomBytes(8); foo(Math.random());`,
          errors: 1,
        },
        {
          code: `export * from 'crypto'; foo(Math.random());`,
          errors: 1,
        },
        {
          code: `import { createCipheriv } from 'node:crypto';
export function pickColor() { return Math.random(); }`,
          errors: [
            {
              message: 'Make sure that using this pseudorandom number generator is safe here.',
              line: 2,
              endLine: 2,
              column: 38,
              endColumn: 51,
            },
          ],
        },
        {
          code: `const c = require('crypto'); foo(Math.random());`,
          errors: 1,
        },
        {
          code: `import { x } from '@noble/hashes/sha256'; foo(Math.random());`,
          errors: 1,
        },
        {
          code: `function generateSessionToken() { return Math.random().toString(36); }`,
          errors: 1,
        },
        {
          code: `function resetPassword(email) { const code = Math.floor(Math.random() * 1000000); send(email, code); }`,
          errors: 1,
        },
        {
          code: `function sign(payload) { const nonce = Math.random(); return hash(payload + nonce); }`,
          errors: 1,
        },
        {
          code: `const generateToken = () => Math.random();`,
          errors: 1,
        },
        {
          code: `const obj = { makeSecret: function () { return Math.random(); } };`,
          errors: 1,
        },
        {
          code: `const token = Math.random();`,
          errors: 1,
        },
        {
          code: `function f() { const sessionId = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const randomBytes = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const AES_KEY = Math.random(); }`,
          errors: 1,
        },
      ],
    });
  });

  it('S2245 TypeScript import forms', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    ruleTester.run('crypto import via import-equals', rule, {
      valid: [{ code: `import lodash = require('lodash'); foo(Math.random());` }],
      invalid: [
        {
          code: `import crypto = require('crypto'); foo(Math.random());`,
          errors: 1,
        },
      ],
    });
  });
});
