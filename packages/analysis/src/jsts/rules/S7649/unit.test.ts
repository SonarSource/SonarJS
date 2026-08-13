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
import pkg from '@angular-eslint/eslint-plugin';
import type { Rule } from 'eslint';

const { rules: upstreamRules } = pkg as unknown as { rules: Record<string, Rule.RuleModule> };

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
          // future-reserved word and a contextual keyword, still whitelisted
          code: `
            @Directive()
            class ExampleDirective {
              @Input('enum') kind = '';
              @Input('yield') step = '';
            }
          `,
        },
        {
          // backtick-quoted alias (TemplateElement, not a plain string Literal)
          code: `
            @Directive()
            class ExampleDirective {
              @Input(\`default\`) fallback = '';
            }
          `,
        },
        {
          // signal-based input()/input.required() alias form
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              panelClass = input('', { alias: 'class' });
              datepicker = input.required<string>({ alias: 'for' });
            }
          `,
        },
        {
          // JS-2234: reserved-word alias declared via the `inputs` metadata array form
          code: `
            @Directive({ selector: 'app-x', inputs: ['panelClass: class'] })
            class ExampleDirective {
              panelClass = '';
            }
          `,
        },
        {
          // reserved-word alias on a setter input (MethodDefinition), distinct member name
          code: `
            @Directive()
            class ExampleDirective {
              @Input('class') set panelClass(value: string) {}
            }
          `,
        },
        {
          // reserved-word alias declared via the `@Input({ alias })` object form
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input({ alias: 'class' }) panelClass = '';
            }
          `,
        },
      ],
      invalid: [
        {
          // non-keyword aliases must remain reported, with the upstream suggestions preserved
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input('disabled') isDisabled = false;
            }
          `,
          errors: [
            {
              messageId: 'noInputRename',
              suggestions: [
                {
                  messageId: 'suggestRemoveAliasName',
                  output: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input() isDisabled = false;
            }
          `,
                },
                {
                  messageId: 'suggestReplaceOriginalNameWithAliasName',
                  output: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input() disabled = false;
            }
          `,
                },
              ],
            },
          ],
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
        {
          // JS-2234: a reserved word used as a redundant alias (member has the same name)
          // is not a rename, so it must still be reported with the upstream safe auto-fix
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input('class') class = '';
            }
          `,
          errors: 1,
          output: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input() class = '';
            }
          `,
        },
        {
          // non-reserved alias via the `inputs` metadata array form must remain reported
          code: `
            @Directive({ selector: 'app-x', inputs: ['isDisabled: disabled'] })
            class ExampleDirective {
              isDisabled = false;
            }
          `,
          errors: 1,
        },
        {
          // redundant reserved-word alias on a setter (member has the same name) is not a rename,
          // so it must still be reported with the upstream safe auto-fix
          code: `
            @Directive()
            class ExampleDirective {
              @Input('class') set class(value: string) {}
            }
          `,
          errors: 1,
          output: `
            @Directive()
            class ExampleDirective {
              @Input() set class(value: string) {}
            }
          `,
        },
        {
          // redundant reserved-word alias via the signal input() form must remain reported
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              class = input('', { alias: 'class' });
            }
          `,
          errors: 1,
          output: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              class = input('');
            }
          `,
        },
        {
          // redundant reserved-word alias via the `inputs` metadata array form must remain reported
          code: `
            @Directive({ selector: 'app-x', inputs: ['class: class'] })
            class ExampleDirective {
              class = '';
            }
          `,
          errors: 1,
          output: `
            @Directive({ selector: 'app-x', inputs: ['class'] })
            class ExampleDirective {
              class = '';
            }
          `,
        },
      ],
    });
  });

  it('relies on the upstream rule still reporting reserved-word aliases', () => {
    // Sentinel: the `valid` cases above only prove suppression as long as the undecorated
    // upstream rule reports these aliases in the first place. If upstream ever stops, this
    // fails instead of the whitelist silently going vacuous.
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-input-rename', upstreamRules['no-input-rename'], {
      valid: [],
      invalid: [
        {
          code: `
            @Component({ selector: 'app-example', template: '' })
            class ExampleComponent {
              @Input('class') panelClass = '';
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
