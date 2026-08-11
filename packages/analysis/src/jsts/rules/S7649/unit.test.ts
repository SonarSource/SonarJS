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
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const RESERVED_WORDS = [
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
];

describe('S7649', () => {
  it('does not report an input alias that is a JavaScript reserved word', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('S7649', rule, {
      valid: [
        {
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input('class') panelClass = '';
              @Input('for') datepicker = '';
            }
          `,
        },
        {
          code: `
            @Directive()
            class ExampleDirective {
              ${RESERVED_WORDS.map((word, i) => `@Input('${word}') member${i} = '';`).join('\n              ')}
            }
          `,
        },
        {
          code: `
            @Directive()
            class ExampleDirective {
              @Input(\`default\`) fallback = '';
            }
          `,
        },
        {
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              panelClass = input('', { alias: 'class' });
              datepicker = input.required<string>({ alias: 'for' });
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input('disabled') isDisabled = false;
            }
          `,
          errors: 1,
        },
        {
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              hrefInput = input('', { alias: 'href' });
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
