/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import { rule } from 'rules/hashing';

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: 'module' } });
ruleTester.run('Using weak hashing algorithms is security-sensitive', rule, {
  valid: [
    {
      code: `
        crypto.createHash();
        `,
    },
    {
      code: `
        crypto.createHash(unknown);
        `,
    },
    {
      code: `
        crypto.createHash('sha1');
        `,
    },
    {
      code: `
        const crypto = require('crypto');
        crypto.createHash('sha512');`,
    },
    {
      code: `
        const crypto = require('crypto');
        crypto.createHsah('sha1');`,
    },
    {
      code: `
        const otpyrc = require('otpyrc');
        otpyrc.createHash('sha1');
      `,
    },
  ],
  invalid: [
    {
      code: `
        const crypto = require('crypto');
        crypto.createHash('sha1');
      `,
      errors: 1,
    },
    {
      code: `
        const crypto = require('crypto');
        crypto.createHash('SHA1');
      `,
      errors: 1,
    },
    {
      code: `
        const foo = require('crypto');
        foo.createHash('sha1');
      `,
      errors: 1,
    },
    {
      code: `
        const createHash = require('crypto').createHash;
        createHash('sha1');
      `,
      errors: 1,
    },
    {
      code: `
        import * as crypto from 'crypto';
        crypto.createHash('sha1');
      `,
      errors: 1,
    },
    {
      code: `
        import {createHash} from 'crypto';
        createHash('sha1');
      `,
      errors: 1,
    },
  ],
});
