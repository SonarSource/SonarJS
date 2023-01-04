/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { TypeScriptRuleTester } from '../../../tools';
import { rule } from 'linting/eslint/rules/encryption-secure-mode';

const ruleTesterJs = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });
const ruleTesterTs = new TypeScriptRuleTester();

const testCases = {
  valid: [
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      var iv8 = Buffer.from(crypto.randomBytes(8));
      const nonce = crypto.randomBytes(12);
      crypto.createCipheriv("AES-128-CFB", key, iv);

      crypto.createCipheriv("AES-128-CFB8", key, iv);
      crypto.createCipheriv("AES-128-CTR", key, iv);
      crypto.createCipheriv("id-aes128-GCM", key, iv);
      crypto.createCipheriv("AES-128-OCB", key, nonce, {
        authTagLength: 16
      });
      crypto.createCipheriv("AES-128-OFB", key, iv);
      crypto.createCipheriv("aes128-wrap", key, iv8); // Alias of id-aes128-wrap
      crypto.createCipheriv("id-aes128-CCM", key, nonce, {
        authTagLength: 16
      });
      crypto.createCipheriv("id-aes128-wrap", key, iv8);
      crypto.createCipheriv("AES-192-CFB", key, iv);

      crypto.createCipheriv("RC4", key, "");
      crypto.createCipheriv("RC4-40", key, "");
      crypto.createCipheriv("RC4-HMAC-MD5", key, "");
      crypto.createCipheriv("SEED-CFB", key, iv);
            `,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      let algorithm = "AES-128-CBC";
      if (x) {
        algorithm = "other";
      }
      crypto.createCipheriv(algorithm, key, iv);
            `,
    },
    {
      code: `
      const crypto = require('crypto');
      crypto.createCipheriv();
            `,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      crypto.createCipheriv();
            `,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv(42, key, iv);
            `,
    },
  ],
  invalid: [
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC", key, iv);
            `,
      errors: [
        {
          line: 5,
          column: 29,
          endLine: 5,
          endColumn: 42,
          message: 'Use a secure mode and padding scheme.',
        },
      ],
    },
    {
      code: `
      const crypto = require('node:crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      const algorithm = "AES-128-CBC";
      crypto.createCipheriv(algorithm, key, iv);
            `,
      errors: [
        {
          line: 6,
          column: 29,
          endLine: 6,
          endColumn: 38,
          message: 'Use a secure mode and padding scheme.',
        },
      ],
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC-HMAC-SHA1", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC-HMAC-SHA256", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      crypto.createCipheriv("AES-128-ECB", key, "");
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES128", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC-HMAC-SHA1", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-128-CBC-HMAC-SHA256", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("aes128", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      crypto.createCipheriv("AES-192-ECB", key, "");
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      crypto.createCipheriv("AES192", key, "");
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES-192-CBC", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("aes192", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("AES256", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("BF", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("blowfish", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("CAMELLIA128", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("CAMELLIA192", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("CAMELLIA256", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("CAST", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("DES", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("DES-EDE", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("DES-EDE3", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("DES3", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("DESX", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("RC2", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("RC2-40", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("RC2-64", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("RC2-128", key, iv);
            `,
      errors: 1,
    },
    {
      code: `
      const crypto = require('crypto');
      var key = crypto.randomBytes(16);
      var iv = Buffer.from(crypto.randomBytes(16));
      crypto.createCipheriv("SEED", key, iv);
            `,
      errors: 1,
    },
  ],
};

ruleTesterJs.run(
  '[JS] Encryption algorithms should be used with secure mode and padding scheme',
  rule,
  testCases,
);
ruleTesterTs.run(
  '[TS] Encryption algorithms should be used with secure mode and padding scheme',
  rule,
  testCases,
);
