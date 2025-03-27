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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S6959', () => {
  it('S6959', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('"Array.reduce()" calls should include an initial value', rule, {
      valid: [
        {
          code: 'xs.reduce((acc, x) => acc + x);',
        },
        {
          code: '[1,2,3].reduce((acc, x) => acc + x, 0);',
        },
        {
          code: 'const xs = [1,2,3]; xs.reduce((acc, x) => acc + x, 0);',
        },
      ],
      invalid: [
        {
          code: '[1,2,3].reduce((acc, x) => acc + x);',
          errors: 1,
        },
        {
          code: 'const xs = [1,2,3]; xs.reduce((acc, x) => acc + x);',
          errors: 1,
        },
      ],
    });
  });
});
