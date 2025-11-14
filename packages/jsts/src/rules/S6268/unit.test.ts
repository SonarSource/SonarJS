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

describe('S6268', () => {
  it('S6268', () => {
    const ruleTesterTs = new DefaultParserRuleTester();
    ruleTesterTs.run('', rule, {
      valid: [
        {
          code: `
      // without object
      bypassSecurityTrustHtml(foo);

      // with wrong number of arguments
      sanitizer.bypassSecurityTrustHtml(foo, bar);
      sanitizer.bypassSecurityTrustHtml();

      // with wrong spelling
      sanitizer.bypassSecurityTrusthtml(value);
      sanitizer.bypassSecurityTrustHtml_(value);
      sanitizer._bypassSecurityTrustHtml(value);

      // with hardcoded input
      sanitizer.bypassSecurityTrustHtml('input');
      sanitizer.bypassSecurityTrustHtml("input");
      sanitizer.bypassSecurityTrustHtml(\`input\`);
      `,
        },
      ],
      invalid: [
        {
          code: `
      sanitizer.bypassSecurityTrustHtml(value);
      sanitizer.bypassSecurityTrustStyle(value);
      sanitizer.bypassSecurityTrustScript(value);
      sanitizer.bypassSecurityTrustUrl(value);
      sanitizer.bypassSecurityTrustResourceUrl(value);
      `,
          errors: 5,
        },
        {
          code: `
      whatever().bypassSecurityTrustHtml(whateverElse());
      `,
          errors: [
            {
              message: 'Make sure disabling Angular built-in sanitization is safe here.',
              line: 2,
              column: 18,
              endLine: 2,
              endColumn: 41,
            },
          ],
        },
        {
          code: `
      sanitizer.bypassSecurityTrustHtml(\`\${whatever()}\`);
      `,
          errors: [
            {
              message: 'Make sure disabling Angular built-in sanitization is safe here.',
            },
          ],
        },
      ],
    });
  });
});
