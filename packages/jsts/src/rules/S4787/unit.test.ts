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

describe('S4787', () => {
  it('S4787', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Encrypting data is security-sensitive: client side', rule, {
      valid: [
        {
          // no call
          code: `crypto.subtle.encrypt`,
        },
        {
          // not "encrypt" or "decrypt"
          code: `crypto.subtle.digest()`,
        },
        {
          // no "crypto.subtle"
          code: `foo.encrypt()`,
        },
      ],
      invalid: [
        {
          code: `crypto.subtle.encrypt(algorithm, key, plainData);`,
          errors: [
            {
              message: 'Make sure that encrypting data is safe here.',
              line: 1,
              endLine: 1,
              column: 1,
              endColumn: 22,
            },
          ],
        },
        {
          code: `let subtle = crypto.subtle; subtle.encrypt();`,
          errors: 1,
        },
        {
          code: `let encrypt = crypto.subtle.encrypt; encrypt();`,
          errors: 1,
        },
        {
          code: `let subtle = window.crypto.subtle; subtle.decrypt();`,
          errors: 1,
        },
      ],
    });

    ruleTester.run('Encrypting data is security-sensitive: server side', rule, {
      valid: [
        {
          code: `const crypto = require('foo'); crypto.createCipher();`,
        },
        {
          code: `const crypto = require('crypto'); crypto.scryptSync();`,
        },
        {
          code: `import * as bar from 'crypto'; foo.createCipher();`,
        },
        {
          code: `import * as crypto from 'foo'; crypto.createCipher();`,
        },
        {
          code: `import * as crypto from 'crypto'; crypto.scryptSync();`,
        },
        {
          code: `const createCipher = require('foo').createCipher; createCipher();`,
        },
      ],
      invalid: [
        {
          code: `const crypto = require('crypto'); crypto.createCipher();`,
          errors: [
            {
              message: 'Make sure that encrypting data is safe here.',
              line: 1,
              endLine: 1,
              column: 35,
              endColumn: 54,
            },
          ],
        },
        {
          code: `const createCipher = require('crypto').createCipher; createCipher();`,
          errors: 1,
        },
        {
          code: `import * as foo from 'crypto'; foo.createCipher();`,
          errors: 1,
        },
        {
          code: `import { createCipher } from 'crypto'; createCipher();`,
          errors: 1,
        },
        {
          code: `import { publicEncrypt } from 'crypto'; publicEncrypt();`,
          errors: 1,
        },
      ],
    });
  });
});
