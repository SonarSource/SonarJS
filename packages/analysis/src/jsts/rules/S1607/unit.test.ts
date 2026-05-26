/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';
import path from 'node:path';

describe('S1607', () => {
  it('S1607', () => {
    const ruleTester = new DefaultParserRuleTester();
    const noFrameworkFixture = path.join(import.meta.dirname, 'fixtures', 'test.js');

    ruleTester.run(`Tests should not be skipped without providing a reason`, rule, {
      valid: [
        {
          code: `it.skip('test', function() {});`,
          filename: noFrameworkFixture,
        },
      ],
      invalid: [],
    });
  });
});
