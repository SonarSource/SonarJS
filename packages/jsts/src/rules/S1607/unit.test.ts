/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

describe('S1607', () => {
  it('S1607', () => {
    process.chdir(import.meta.dirname); // change current working dir to avoid the package.json lookup to up in the tree
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run(`Tests should not be skipped without providing a reason`, rule, {
      valid: [
        {
          code: `it.skip('test', function() {});`,
        },
      ],
      invalid: [],
    });
  });
});
