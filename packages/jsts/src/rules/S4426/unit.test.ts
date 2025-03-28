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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4426', () => {
  it('S4426', () => {
    const ruleTesterJS = new DefaultParserRuleTester();

    ruleTesterJS.run('Cryptographic keys should be robust', rule, {
      valid: [
        {
          code: `
        crypto.generateKeyPair('rsa', {
          modulusLength: 2048,  // Compliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
         }, callback);
      `,
        },
        {
          code: `
        // adding coverage
        crypto.generateKeyPair('ed25519', {  // unrelated algorithm
          modulusLength: 1,  // Compliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
         }, callback);
         
         crypto.generateKeyPair('ed25519'); // missing options
         crypto.generateKeyPair('ed25519', options()); // options not an ObjectExpression 
         crypto.generateKeyPair(alg(), {}); // algorithm not Literal 
      `,
        },
        {
          code: `
        const alg = 'ed25519';
        crypto.generateKeyPair(alg, {  // alg not literal
          modulusLength: 1,  // Compliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
         }, callback);
      `,
        },
        {
          code: `
        crypto.generateKeyPair('dsa', {
          divisorLength: 224,  // Compliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
         }, callback);
      `,
        },
        {
          code: `
        crypto.generateKeyPair('ec', {
          namedCurve: 'secp224k1', 
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, callback); // compliant
      `,
        },
      ],
      invalid: [
        {
          code: `
        var { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
          modulusLength: 1024,  // Noncompliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }); // Noncompliant: 1024 bits is too short for a RSA key pair       
      `,
          errors: [
            {
              message: `Use a modulus length of at least 2048 bits for rsa cipher algorithm.`,
              line: 3,
              endLine: 3,
              column: 11,
              endColumn: 30,
            },
          ],
        },
        {
          code: `
        const alg = 'rsa';
        var { privateKey, publicKey } = crypto.generateKeyPairSync(alg, {
          modulusLength: 1024,  // Noncompliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }); // Noncompliant: 1024 bits is too short for a RSA key pair       
      `,
          errors: [
            {
              message: `Use a modulus length of at least 2048 bits for rsa cipher algorithm.`,
              line: 4,
              endLine: 4,
              column: 11,
              endColumn: 30,
            },
          ],
        },
        {
          code: `
        var options = {
          modulusLength: 1024,  // Noncompliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        };

        var { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', options); // Noncompliant       
      `,
          errors: [
            {
              message: `Use a modulus length of at least 2048 bits for rsa cipher algorithm.`,
              line: 3,
              endLine: 3,
              column: 11,
              endColumn: 30,
            },
          ],
        },
        {
          code: `
        var { privateKey, publicKey } = crypto.generateKeyPairSync('dsa', {
          modulusLength: 1024,  // Noncompliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }); // Noncompliant: 1024 bits is too short for a RSA key pair       
      `,
          errors: [
            {
              message: `Use a modulus length of at least 2048 bits for dsa cipher algorithm.`,
              line: 3,
              endLine: 3,
              column: 11,
              endColumn: 30,
            },
          ],
        },
        {
          code: `
       crypto.generateKeyPair('dsa', {
          modulusLength: 2048,  // Compliant
          divisorLength: 112, // Noncompliant
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, callback); // Noncompliant
      `,
          errors: [
            {
              message: `Use a divisor length of at least 224 bits for dsa cipher algorithm.`,
              line: 4,
              endLine: 4,
              column: 11,
              endColumn: 29,
            },
          ],
        },
        {
          code: `
        const crypto = require('crypto');
        crypto.generateKeyPair('ec', {
          namedCurve: 'secp112r2', 
          publicKeyEncoding:  { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }, callback); // Noncompliant: secp112r2 curve doesn't provide enough security
      `,
          errors: [
            {
              message: `secp112r2 doesn't provide enough security. Use a stronger curve.`,
              line: 4,
              endLine: 4,
              column: 11,
              endColumn: 34,
            },
          ],
        },
      ],
    });
  });
});
