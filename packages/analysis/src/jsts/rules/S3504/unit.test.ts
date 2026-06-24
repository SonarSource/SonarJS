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
import path from 'node:path';
import { describe, it } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';

describe('S3504', () => {
  it('should ignore vendor files', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S3504 vendor paths', rule, {
      valid: [
        {
          code: `var vendorValue = 1;`,
          filename: path.join('project', 'vendor', 'legacy.js'),
        },
        {
          code: `var vendorValue = 1;`,
          filename: path.join('project', 'vendors', 'legacy.js'),
        },
        {
          code: `var vendorValue = 1;`,
          filename: path.join('project', 'assets', 'legacy.js'),
        },
        {
          code: `var vendorValue = 1;`,
          filename: path.join('project', 'static', 'legacy.js'),
        },
      ],
      invalid: [
        {
          code: `var sourceValue = 1;`,
          filename: path.join('project', 'src', 'legacy.js'),
          output: `let sourceValue = 1;`,
          errors: 1,
        },
        {
          code: `var libraryValue = 1;`,
          filename: path.join('project', 'lib', 'legacy.js'),
          output: `let libraryValue = 1;`,
          errors: 1,
        },
      ],
    });
  });
});
