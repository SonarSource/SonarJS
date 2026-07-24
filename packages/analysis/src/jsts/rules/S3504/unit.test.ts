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
          code: `var x = 1;`,
          filename: path.join('src', 'vs', 'base', 'common', 'semver', 'semver.js'),
        },
        {
          code: `var DOMPurify = 1;`,
          filename: path.join('src', 'vs', 'base', 'browser', 'dompurify', 'dompurify.js'),
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

  it('should suppress files that predominantly use var', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S3504 var-heavy files', rule, {
      valid: [
        {
          code: `
            var first = 1;
            var second = first + 1;
            let third = second + 1;
            var fourth = third + 1;
          `,
        },
      ],
      invalid: [
        {
          code: `
            const first = 1;
            let second = first + 1;
            var third = second + 1;
            let fourth = third + 1;
            var fifth = fourth + 1;
            const sixth = fifth + 1;
          `,
          output: `
            const first = 1;
            let second = first + 1;
            let third = second + 1;
            let fourth = third + 1;
            let fifth = fourth + 1;
            const sixth = fifth + 1;
          `,
          errors: 2,
        },
        {
          code: `
            var first = 1;
            let second = first + 1;
            var third = second + 1;
            const fourth = third + 1;
            var fifth = fourth + 1;
            let sixth = fifth + 1;
          `,
          output: `
            let first = 1;
            let second = first + 1;
            let third = second + 1;
            const fourth = third + 1;
            let fifth = fourth + 1;
            let sixth = fifth + 1;
          `,
          errors: 3,
        },
      ],
    });
  });

  it('should ignore ambient declarations when applying the var heuristic', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S3504 ambient declarations', rule, {
      valid: [],
      invalid: [
        {
          code: `
            declare var apiUrl: string;
            declare var buildNumber: string;
            declare var runtimeConfig: Record<string, string>;
            let currentBuild = buildNumber;
            var legacyBuild = currentBuild;
          `,
          output: `
            declare var apiUrl: string;
            declare var buildNumber: string;
            declare var runtimeConfig: Record<string, string>;
            let currentBuild = buildNumber;
            let legacyBuild = currentBuild;
          `,
          errors: 1,
        },
      ],
    });
  });
});
