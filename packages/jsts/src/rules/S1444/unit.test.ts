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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1444', () => {
  it('should not raise issues on JavaScript files', () => {
    const ruleTester = new DefaultParserRuleTester();
    // JS-926: The `readonly` modifier is TypeScript-only, so this rule should not run on JavaScript files
    ruleTester.run('S1444 on JS files', rule, {
      valid: [
        {
          code: `
            class C {
              static a = 1;
              static b = 1;
            }
          `,
          filename: 'test.js',
        },
      ],
      invalid: [],
    });
  });
});
