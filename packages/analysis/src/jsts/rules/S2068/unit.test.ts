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
import { rule } from './rule.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('S2068', () => {
  it('S2068', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    const options = [{ passwordWords: ['password', 'pwd', 'passwd', 'passphrase'] }];

    ruleTester.run('Hard-coded passwords should be avoided', rule, {
      valid: [
        // Empty password
        {
          code: `let password = ""`,
          options,
        },
        // Password in L10n path
        {
          code: `let password = 'xK9#mP2$vL5nQ8wR';`,
          filename: path.join('some', 'L10n', 'path', 'file.js'),
          options,
        },
        // Test/spec/mock files are skipped
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.spec.js',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.spec.ts',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.spec.jsx',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.spec.tsx',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.test.js',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.test.ts',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.test.jsx',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'login.test.tsx',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'auth.mock.js',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'auth.mock.ts',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'auth.mock.jsx',
          options,
        },
        {
          code: `const password = 'xK9#mP2$vL5nQ8wR';`,
          filename: 'auth.mock.tsx',
          options,
        },
        // Low-entropy single dictionary words
        {
          code: `const password = 'password';`,
          options,
        },
        {
          code: `const password = 'secret';`,
          options,
        },
        {
          code: `const password = 'admin';`,
          options,
        },
        // Ultra-short dummy values (below minimum length)
        {
          code: `const password = 'pw';`,
          options,
        },
        {
          code: `const password = 'old';`,
          options,
        },
        {
          code: `const password = 'new';`,
          options,
        },
        {
          code: `let password = 'foo';`,
          options,
        },
        // Low-entropy test passwords
        {
          code: `const password = 'testpass';`,
          options,
        },
        // Strings with spaces are natural language, not credentials
        {
          code: `const PASSWORD_REQUIRED = "Password is required";`,
          options,
        },
        {
          code: `const PASSWORD_POLICY = "Password must be at least 8 characters and include an uppercase letter, a number, and a special character.";`,
          options,
        },
        {
          code: `const PASSWORDS_NO_MATCH = "Passwords do not match";`,
          options,
        },
        {
          code: `const CONFIRM_PASSWORD = "Confirm your password";`,
          options,
        },
        {
          code: `const PASSWORD_RESET_MSG = 'Password reset is not available through the platform. Please reset your password through your SSO provider.';`,
          options,
        },
        // i18n translations with spaces
        {
          code: `const translations = { Password: 'Mot de passe' };`,
          options,
        },
        {
          code: `const translations = { 'Forgot password?': 'Mot de passe oublie ?' };`,
          options,
        },
        {
          code: `const translations = { 'New Password': 'Nouveau mot de passe' };`,
          options,
        },
        // i18n single-word labels (low entropy)
        {
          code: `const translations = { Password: 'Password' };`,
          options,
        },
        // CSS / XPath selectors (contain brackets/quotes)
        {
          code: `const selectors = { password_Input: '[id="password"]' };`,
          options,
        },
        {
          code: `const selectors = { password_Input: '//input[@id="password"]' };`,
          options,
        },
        // URL path segments (contain slashes)
        {
          code: `const reset_password_url = "/api/auth/reset_password/";`,
          options,
        },
        {
          code: `const apiEndpoints = { createpassword: '/v1/security/createpassword' };`,
          options,
        },
        // Module path references (contain slashes)
        {
          code: `const moduleMap = { 'reset-password-dialog/index.ts': '@app/users/reset-password-dialog' };`,
          options,
        },
        // HTML input type = 'password'
        {
          code: `let passwordType = 'password';`,
          options,
        },
        // OAuth2 grant type
        {
          code: `const oauthBody = { grant_type: 'password' };`,
          options,
        },
        // Default operator with low-entropy fallback
        {
          code: `let password; password = env.PASSWORD ?? 'default';`,
          options,
        },
        // Ternary with low-entropy values
        {
          code: `const password = isDev ? 'pass' : 'pass';`,
          options,
        },
        {
          code: 'const password = `${env.PASSWORD}`;',
          options,
        },
        // URL with low-entropy password value
        {
          code: `let url = "https://example.com?password=foo";`,
          options,
        },
      ],
      invalid: [
        // High-entropy random-looking strings
        {
          code: `const dbPassword = 'xK9#mP2$vL5nQ8wR';`,
          options,
          errors: [
            {
              message: 'Review this potentially hard-coded password.',
              line: 1,
            },
          ],
        },
        {
          code: `const apiPassword = 'a3f8G2kL9pQ5mN7x';`,
          options,
          errors: 1,
        },
        {
          code: `const servicePassword = 'Jx!9kL#mP2vN5qW8';`,
          options,
          errors: 1,
        },
        {
          code: 'const servicePassword = `Jx!9kL#mP2vN5qW8`;',
          options,
          errors: 1,
        },
        // Case-insensitive detection
        {
          code: `const PASSWORD = 'xK9#mP2$vL5nQ8wR';`,
          options,
          errors: 1,
        },
        {
          code: `const PASSword = 'xK9#mP2$vL5nQ8wR';`,
          options,
          errors: 1,
        },
        // Different password word variations
        {
          code: `const passphrase = 'xK9#mP2$vL5nQ8wR';`,
          options,
          errors: 1,
        },
        // Assignment expression
        {
          code: `let my_pwd; my_pwd = 'xK9#mP2$vL5nQ8wR';`,
          options,
          errors: 1,
        },
        // Class property
        {
          code: `
      export class Example {
        public testingPassword = 'xK9#mP2$vL5nQ8wR';
      }
      `,
          options,
          errors: 1,
        },
        // Object property
        {
          code: `const config = { passwd: 'xK9#mP2$vL5nQ8wR' };`,
          options,
          errors: 1,
        },
        // URL parameters with high-entropy password
        {
          code: `let url = "https://example.com?password=hl2OAIXXZ60";`,
          options,
          errors: 1,
        },
        {
          code: `let url = "https://example.com?PASSWORD=hl2OAIXXZ60";`,
          options,
          errors: 1,
        },
        {
          code: `let url = "https://example.com?PASSword=hl2OAIXXZ60";`,
          options,
          errors: 1,
        },
        {
          code: 'let url = `https://example.com?password=hl2OAIXXZ60`;',
          options,
          errors: 1,
        },
        // Custom password words
        {
          code: `let secret = 'xK9#mP2$vL5nQ8wR';`,
          options: [{ passwordWords: ['secret'] }],
          errors: 1,
        },
        {
          code: `let secret = 'xK9#mP2$vL5nQ8wR';`,
          options: [{ passwordWords: ['SECRET'] }],
          errors: 1,
        },
        {
          code: `let url = "https://example.com?token=hl2OAIXXZ60";`,
          options: [{ passwordWords: ['token'] }],
          errors: 1,
        },
        // Non-L10n path should still raise
        {
          code: `let password = 'xK9#mP2$vL5nQ8wR';`,
          filename: path.join('some', 'random', 'path', 'file.js'),
          options,
          errors: 1,
        },
        // Hex hash used as password
        {
          code: `const password_hash = '8fe2708bcf9c44c89ab44d0c70bf3d17';`,
          options,
          errors: 1,
        },
        // Base64 encoded string as password
        {
          code: `const password_b64 = 'dGhpcyBpcyBhIHNlY3JldA==';`,
          options,
          errors: 1,
        },
        // High-entropy in object literal
        {
          code: `const prodConfig = { password: 'Z8k#mP2$vL5nQ9wR3xJ7' };`,
          options,
          errors: 1,
        },
        // UUID used as password
        {
          code: `const password_uuid = '550e8400-e29b-41d4-a716-446655440000';`,
          options,
          errors: 1,
        },
        // Default operator with high-entropy fallback
        {
          code: `let password; password = env.PASSWORD ?? 'xK9#mP2$vL5nQ8wR';`,
          options,
          errors: 1,
        },
        // Ternary with high-entropy value
        {
          code: `const password = isDev ? 'xK9#mP2$vL5nQ8wR' : 'a3f8G2kL9pQ5mN7x';`,
          options,
          errors: 1,
        },
      ],
    });
  });
});
