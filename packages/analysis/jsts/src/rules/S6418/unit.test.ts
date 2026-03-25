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
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S6418', () => {
  it('S6418', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('Rule S6418 - no-hardcoded-secrets', rule, {
      valid: [],
      invalid: [
        // we're verifying that given a broken RegExp, the rule still works.
        {
          code: `
      secret = '9ah9w8dha9w8hd98h';
      `,
          options: [
            {
              secretWords: 'sel/\\',
              randomnessSensibility: 0.5,
            },
          ],
          errors: 1,
        },
      ],
    });
  });
});
