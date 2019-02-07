import { RuleTester } from "eslint";

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018, sourceType: "module" } });
import { rule } from "../../src/rules/hashing";

ruleTester.run("Hashing data is security-sensitive: client side", rule, {
  valid: [
    {
      // no call
      code: `crypto.subtle.digest`,
    },
    {
      // not "digest"
      code: `crypto.subtle.encrypt()`,
    },
    {
      // no "crypto.subtle"
      code: `foo.digest()`,
    },
  ],
  invalid: [
    {
      code: `crypto.subtle.digest("SHA-256", buffer);`,
      errors: [
        {
          message: "Make sure that hashing data is safe here.",
          line: 1,
          endLine: 1,
          column: 1,
          endColumn: 21,
        },
      ],
    },
    {
      code: `let subtle = crypto.subtle; subtle.digest();`,
      errors: 1,
    },
    {
      code: `let digest = crypto.subtle.digest; digest();`,
      errors: 1,
    },
    {
      code: `let subtle = window.crypto.subtle; subtle.digest();`,
      errors: 1,
    },
  ],
});

ruleTester.run("Hashing data is security-sensitive: server side", rule, {
  valid: [
    {
      code: `const crypto = require('foo'); crypto.digest();`,
    },
    {
      code: `const crypto = require('crypto'); crypto.digest();`,
    },
    {
      code: `import * as bar from 'crypto'; foo.digest();`,
    },
    {
      code: `import * as crypto from 'foo'; crypto.digest();`,
    },
    {
      code: `import * as crypto from 'crypto'; crypto.encrypt();`,
    },
    {
      code: `import { encrypt } from 'crypto'; crypto.encrypt();`,
    },
    {
      code: `const digest = require('foo').digest; digest();`,
    },
  ],
  invalid: [
    {
      code: `const crypto = require('crypto'); crypto.createHash();`,
      errors: [
        {
          message: "Make sure that hashing data is safe here.",
          line: 1,
          endLine: 1,
          column: 35,
          endColumn: 52,
        },
      ],
    },
    {
      code: `const createHash = require('crypto').createHash; createHash();`,
      errors: 1,
    },
    {
      code: `import * as foo from 'crypto'; foo.createHash();`,
      errors: 1,
    },
    {
      code: `import { createHash } from 'crypto'; createHash();`,
      errors: 1,
    },
    {
      code: `import { scrypt } from 'crypto'; scrypt();`,
      errors: 1,
    },
    {
      code: `import { scryptSync } from 'crypto'; scryptSync();`,
      errors: 1,
    },
  ],
});
