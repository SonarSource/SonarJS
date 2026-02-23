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
import path from 'node:path';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S4325', () => {
  it('S4325', () => {
    const ruleTester = new RuleTester({
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: path.join(import.meta.dirname, 'fixtures'),
      },
    });

    ruleTester.run('S4325', rule, {
      valid: [
        {
          // assertion is necessary: name can be null
          code: `function greet(name: string | null) { console.log(name!); }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
        {
          // assertion is necessary: db can be null
          code: `
            interface Database { query(id: string): unknown; }
            class UserService {
              private db: Database | null = null;
              getUser(id: string) {
                return this.db!.query(id);
              }
            }
          `,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
        },
      ],
      invalid: [
        {
          // non-null assertion on a non-nullable type is unnecessary
          code: `function greet(name: string) { console.log(name!); }`,
          filename: path.join(import.meta.dirname, 'fixtures/index.ts'),
          errors: 1,
        },
      ],
    });
  });
});
