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
import { RuleTester } from 'eslint';
import { rule } from './/index.js';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
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
      code: `import bar from 'crypto'; foo.createCipher();`,
    },
    {
      code: `import crypto from 'foo'; crypto.createCipher();`,
    },
    {
      code: `import crypto from 'crypto'; crypto.scryptSync();`,
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
      code: `import foo from 'crypto'; foo.createCipher();`,
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
