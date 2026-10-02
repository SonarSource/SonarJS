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
import pkg from '@angular-eslint/eslint-plugin';
import type { Rule } from 'eslint';
import { describe, it } from 'node:test';

const { rules: upstreamRules } = pkg as unknown as { rules: Record<string, Rule.RuleModule> };

describe('S7652', () => {
  const ruleTester = new NoTypeCheckingRuleTester();
  const angular = `import { Component, Directive, Output, output } from '@angular/core';`;
  const deprecatedOutputReplacements = [
    `${angular}
      @Component({ outputs: ['refresh'] })
      class C {
        /** @deprecated Use refresh instead. */
        onRefresh = output<void>();
        refresh = this.onRefresh;
      }
    `,
    `${angular}
      @Component({ outputs: ['onRefresh', 'refresh'] })
      class C {
        /** @deprecated Use refresh instead. */
        onRefresh = new EventEmitter<void>();
        refresh = this.onRefresh;
      }
    `,
  ];

  for (const { alias, prohibited } of [
    { alias: 'on', prohibited: true },
    { alias: 'on123', prohibited: true },
    { alias: 'on_click', prohibited: true },
    { alias: 'oNotation', prohibited: false },
    { alias: 'OnClick', prohibited: false },
    { alias: '', prohibited: false },
  ]) {
    it(`checks the alias boundary ${JSON.stringify(alias)} across output forms`, () => {
      const cases = [
        {
          code: `${angular} class C { onRefresh = output({ alias: '${alias}' }); }`,
          reports: prohibited,
          errors: prohibited ? 2 : 1,
        },
        {
          code: `${angular} class C { @Output('${alias}') onRefresh = new EventEmitter(); }`,
          reports: prohibited || alias === '',
          errors: prohibited ? 2 : 1,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: ${alias}'] }) class C {}`,
          reports: prohibited || alias === '',
          errors: 1,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: ${alias}'] }] }) class C {}`,
          reports: prohibited || alias === '',
          errors: 1,
        },
      ];
      ruleTester.run('S7652', rule, {
        valid: cases.filter(test => !test.reports).map(({ code }) => ({ code })),
        invalid: cases.filter(test => test.reports).map(({ code, errors }) => ({ code, errors })),
      });
      ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
        valid: [],
        invalid: cases.map(({ code, errors }) => ({ code, errors })),
      });
    });
  }

  it('uses explicit, compliant public output aliases', () => {
    ruleTester.run('S7652', rule, {
      valid: [
        ...deprecatedOutputReplacements.map(code => ({ code })),
        {
          code: `${angular} class C { onRefresh = output({ alias: 'refresh' }); }`,
        },
        {
          code: `${angular} class C { onRefresh = output({ 'alias': 'refresh' }); }`,
        },
        {
          code: `${angular} class C { onRefresh = output({ alias: 'online' }); }`,
        },
        {
          code: `${angular} class C { onRefresh = output({ alias: \`refresh\` }); }`,
        },
        {
          code: `${angular} class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
        },
        {
          code: `${angular} class C { @Output(\`refresh\`) onRefresh = new EventEmitter(); }`,
        },
        {
          code: `${angular} class C { @Output('refresh') get onRefresh() { return new EventEmitter(); } }`,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: refresh'] }) class C {}`,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh'] }) class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
        },
        {
          code: `${angular} @Component({ outputs: [\`onRefresh: refresh\`] }) class C {}`,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: refresh'] }] }) class C {}`,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: [\`onRefresh: refresh\`] }] }) class C {}`,
        },
      ],
      invalid: [
        {
          code: `function output(_: unknown) { return 0; } class C { onRefresh = output({ alias: 'refresh' }); }`,
          errors: 1,
        },
        {
          code: `function Component(_: unknown) { return () => undefined; } @Component({ outputs: ['onRefresh: refresh'] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} class C { onRefresh = output(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { onRefresh = output({ alias: name }); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { onRefresh = output({ alias: 'onSave' }); }`,
          errors: 2,
        },
        {
          code: `${angular} class C { @Output() onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output('') onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output(name) onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output('onSave') onRefresh = new EventEmitter(); }`,
          errors: 2,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: refresh'] }) class C { @Output('onSave') onRefresh = new EventEmitter(); }`,
          errors: 3,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh'] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: onSave'] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: refresh: malformed'] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: onSave'] }] }) class C {}`,
          errors: 1,
        },
      ],
    });
  });

  it('recognizes only complete documented output replacements', () => {
    ruleTester.run('S7652', rule, {
      valid: [],
      invalid: [
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              onRefresh = output<void>();
              refresh = this.onRefresh;
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              /* @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            @Component({})
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = output<void>();
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh', 'refresh'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            const replacement = 'refresh';
            @Component({ outputs: [replacement] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.other;
            }
          `,
          errors: 1,
        },
      ],
    });
  });

  it('suppresses only forms reported by the upstream rule', () => {
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: [
        {
          code: `${angular} class C { onRefresh = output({ alias: 'refresh' }); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { onRefresh = output({ 'alias': 'refresh' }); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { onRefresh = output({ alias: 'online' }); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { onRefresh = output({ alias: \`refresh\` }); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output(\`refresh\`) onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output('refresh') get onRefresh() { return new EventEmitter(); } }`,
          errors: 1,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: refresh'] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh'] }) class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
          errors: 2,
        },
        {
          code: `${angular} @Component({ outputs: [\`onRefresh: refresh\`] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: refresh'] }] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: [\`onRefresh: refresh\`] }] }) class C {}`,
          errors: 1,
        },
        ...deprecatedOutputReplacements.map(code => ({ code, errors: 1 })),
      ],
    });
  });
});
