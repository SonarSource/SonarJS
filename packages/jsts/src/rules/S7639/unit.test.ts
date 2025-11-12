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
import { rule } from './index.js';
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S7639', () => {
  it('S7639', () => {
    const ruleTester = new NoTypeCheckingRuleTester();
    
    ruleTester.run('Revoke and change this seed phrase, as it is compromised.', rule, {
      valid: [
        `const a = 42;`,
        `function foo() { return 'bar'; }`,
      ],
      invalid: [
        {
          code: `const seedPhrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";`,
          errors: [{ message: 'Revoke and change this seed phrase, as it is compromised.' }],
        },
      ],
    });
  }
});
