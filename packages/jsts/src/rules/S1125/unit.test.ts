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
import { rule } from './rule.js';
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';

describe('S1125', () => {
  it('S1125', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('no-redundant-boolean', rule, {
      valid: [
        { code: 'a === false;' },
        { code: 'a === true;' },
        { code: 'a !== false;' },
        { code: 'a !== true;' },
        { code: 'a == foo(true);' },
        { code: 'true < 0;' },
        { code: '~true;' },
        { code: '!foo;' },
        { code: 'if (foo(mayBeSomething || false)) {}' },
        { code: 'x ? y || false : z' },
      ],
      invalid: [
        {
          code: 'if (x == true) {}',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 14 }],
        },
        {
          code: 'if (x == false) {}',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 15 }],
        },
        {
          code: 'if (x || false) {}',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 15 }],
        },
        {
          code: 'if (x && false) {}',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 10, endColumn: 15 }],
        },

        {
          code: 'x || false ? 1 : 2',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 6, endColumn: 11 }],
        },

        {
          code: 'fn(!false)',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 5, endColumn: 10 }],
        },

        {
          code: 'a == true == b;',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 6, endColumn: 10 }],
        },
        {
          code: 'a == b == false;',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 11, endColumn: 16 }],
        },
        {
          code: 'a == (true == b) == b;',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 7, endColumn: 11 }],
        },

        {
          code: '!(true);',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 3, endColumn: 7 }],
        },
        {
          code: 'a == (false);',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 7, endColumn: 12 }],
        },

        {
          code: 'true && a;',
          errors: [{ messageId: 'removeUnnecessaryBoolean', column: 1, endColumn: 5 }],
        },
      ],
    });
  });
});
