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
          // `insecure` alone is not a keyword; only the two-word form is
          code: `function f() { const insecure = Math.random(); }`,
        },
        {
          code: `class Shuffler { run() { return Math.random(); } }`,
        },
        {
          // keyword in an unrelated top-level function does not count for module-level code
          code: `function verifyInput(x) {}
const id = Math.random();`,
        },
        {
          code: `class A { verify() {} }
const id = Math.random();`,
        },
        {
          // identifiers of nested functions are other scopes
          code: `function outer() { function hashPassword() {} return Math.random(); }`,
        },
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
          code: `function f() { const insecureRandom = Math.random(); }`,
          errors: 1,
        },
        {
          // class name is outside the method but part of its context
          code: `class AuthService { shuffle() { return Math.random(); } }`,
          errors: 1,
        },
        {
          // result variable of a callback-built value
          code: `const token = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * 62)]).join('');`,
          errors: 1,
        },
        {
          code: `function build() { const token = Array.from({ length: 16 }, () => Math.random()); }`,
          errors: 1,
        },
        {
          code: `import AES from 'crypto-js/aes'; foo(Math.random());`,
          errors: 1,
        },
        {
          code: `import { useSession } from 'next-auth/react'; foo(Math.random());`,
          errors: 1,
        },
        {
          code: `const aes = require('crypto-js/aes'); foo(Math.random());`,
          errors: 1,
        },
        {
          code: `function f() { const AES256_KEY = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const RSA2048 = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const HMAC256 = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const AES_256_KEY = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const SHA256RSA = Math.random(); }`,
          errors: 1,
        },
        {
          code: `function f() { const aes256key = Math.random(); }`,
          errors: 1,
        },
        {
          // digit-bearing keywords still match whole
          code: `function f() { const pbkdf2 = Math.random(); const ChaCha20 = 1; }`,
          errors: 1,
        },
        {
          code: `function f() { const PBKDF2SALT = Math.random(); }`,
          errors: 1,
        },
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
          code: `export class InsecureRandomService extends ChallengeService {
  public static generate5RandomValues(numberOfValues = 5): number[] {
    const numbers = []
    for (let i = 0; i < 5; i++)
      numbers.push(Math.random())
    return numbers
  }
}`,
          errors: 1,
        },
        {
          code: `const generateToken = (() => Math.random()) as () => number;`,
          errors: 1,
        },
        {
          code: `const generateToken = (() => Math.random()) satisfies () => number;`,
          errors: 1,
        },
        {
          code: `const generateToken = (() => Math.random())!;`,
          errors: 1,
        },
        {
          code: `import crypto = require('crypto'); foo(Math.random());`,
          errors: 1,
        },
      ],
    });
  });
});
