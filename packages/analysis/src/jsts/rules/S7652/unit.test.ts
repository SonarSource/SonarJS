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
              inner = class {
                /** @deprecated Use refresh instead. */
                onRefresh = output<void>();
              };
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
              @Output('onSave') refresh = this.onRefresh;
            }
          `,
          errors: 2,
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              @Output('') refresh = this.onRefresh;
            }
          `,
          errors: 1,
        },
        {
          code: `${angular}
            const key: string = 'outputs';
            @Component({ jit: true, outputs: ['onRefresh', 'refresh'], [key]: ['onRefresh'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = new EventEmitter<void>();
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

  it('retains reports when quoted metadata keys override the replacement exposure', () => {
    const cases = [
      {
        code: `${angular}
          @Component({ outputs: ['refresh'], 'outputs': [] })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = output<void>();
            refresh = this.onRefresh;
          }
        `,
        errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier' }],
      },
      {
        code: `${angular}
          @Component({ outputs: ['onRefresh', 'refresh'], 'outputs': [] })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = new EventEmitter<void>();
            refresh = this.onRefresh;
          }
        `,
        errors: [{ messageId: 'noOutputOnPrefix', type: 'Literal' }],
      },
    ];
    ruleTester.run('S7652', rule, { valid: [], invalid: cases });
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: cases,
    });
  });

  it('retains reports when another instance field overwrites the replacement', () => {
    const cases = [
      {
        code: `${angular}
          @Component({ outputs: ['refresh'] })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = output<void>();
            refresh = this.onRefresh;
            refresh = output<void>();
          }
        `,
        errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier' }],
      },
      {
        code: `${angular}
          @Component({ outputs: ['onRefresh', 'refresh'] })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = new EventEmitter<void>();
            refresh = this.onRefresh;
            refresh = new EventEmitter<void>();
          }
        `,
        errors: [{ messageId: 'noOutputOnPrefix', type: 'Literal' }],
      },
    ];
    ruleTester.run('S7652', rule, { valid: [], invalid: cases });
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: cases,
    });
  });

  it('retains reports for constructor writes to either compatibility output', () => {
    for (const { outputs, initializer } of [
      { outputs: "['refresh']", initializer: 'output<void>()' },
      { outputs: "['onRefresh', 'refresh']", initializer: 'new EventEmitter<void>()' },
    ]) {
      const cases = [
        'this.refresh = anotherEmitter;',
        'this.onRefresh = anotherEmitter;',
        'this.refresh! = anotherEmitter;',
        '(this as C).onRefresh = anotherEmitter;',
        "this['refresh'] = anotherEmitter;",
        'this[`onRefresh`] = anotherEmitter;',
        'if (enabled) { this.refresh = anotherEmitter; }',
        'const reset = () => { this.refresh = anotherEmitter; }; reset();',
        'this.refresh ??= anotherEmitter;',
        'this.refresh++;',
        'delete this.onRefresh;',
        '({ value: this.refresh } = source);',
        '[this.onRefresh] = source;',
        'this[key] = anotherEmitter;',
      ].map(body => ({
        code: `${angular}
          @Component({ outputs: ${outputs} })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = ${initializer};
            refresh = this.onRefresh;
            constructor() { ${body} }
          }
        `,
        errors: 1,
      }));
      ruleTester.run('S7652', rule, { valid: [], invalid: cases });
      ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
        valid: [],
        invalid: cases,
      });
    }
  });

  it('keeps constructor reads, unrelated writes, and other this scopes out of the guard', () => {
    const cases = [
      'this.refresh.emit();',
      'this.other = anotherEmitter;',
      "this['other'] = anotherEmitter;",
      'this.other[this.refresh] = value;',
      'function reset() { this.refresh = anotherEmitter; }',
      'const reset = function () { this.onRefresh = anotherEmitter; };',
      'class Other { constructor() { this.refresh = anotherEmitter; } }',
      'const Other = class { constructor() { this.onRefresh = anotherEmitter; } };',
    ].map(body => ({
      code: `${angular}
        @Component({ outputs: ['refresh'] })
        class C {
          /** @deprecated Use refresh instead. */
          onRefresh = output<void>();
          refresh = this.onRefresh;
          constructor() { ${body} }
        }
      `,
    }));
    ruleTester.run('S7652', rule, { valid: cases, invalid: [] });
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: cases.map(test => ({ ...test, errors: 1 })),
    });
  });

  it('retains reports for writes in field initializers and instance methods', () => {
    for (const { outputs, initializer } of [
      { outputs: "['refresh']", initializer: 'output<void>()' },
      { outputs: "['onRefresh', 'refresh']", initializer: 'new EventEmitter<void>()' },
    ]) {
      const cases = [
        'reset = this.refresh = anotherEmitter;',
        'reset = this.onRefresh = anotherEmitter;',
        "reset = this['refresh'] = anotherEmitter;",
        'reset = this[key] = anotherEmitter;',
        'reset = () => { this.refresh = anotherEmitter; };',
        'reset() { this.onRefresh = anotherEmitter; }',
        'get reset() { this.refresh = anotherEmitter; return true; }',
        'set reset(value) { this.onRefresh = value; }',
        'reset(value = this.refresh = anotherEmitter) {}',
        'constructor(value = this.onRefresh = anotherEmitter) {}',
      ].map(member => ({
        code: `${angular}
          @Component({ outputs: ${outputs} })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = ${initializer};
            refresh = this.onRefresh;
            ${member}
          }
        `,
        errors: 1,
      }));
      ruleTester.run('S7652', rule, { valid: [], invalid: cases });
      ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
        valid: [],
        invalid: cases,
      });
    }
  });

  it('preserves valid replacements with unrelated instance writes and reads', () => {
    for (const { outputs, initializer } of [
      { outputs: "['refresh']", initializer: 'output<void>()' },
      { outputs: "['onRefresh', 'refresh']", initializer: 'new EventEmitter<void>()' },
    ]) {
      const cases = [
        'reset = this.other = anotherEmitter;',
        'emit() { this.refresh.emit(); }',
        'reset() { this.other = anotherEmitter; }',
        'reset() { function other() { this.refresh = anotherEmitter; } }',
        'nested = class { reset() { this.refresh = anotherEmitter; } };',
        'static reset() { this.refresh = anotherEmitter; }',
      ].map(member => ({
        code: `${angular}
          @Component({ outputs: ${outputs} })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = ${initializer};
            refresh = this.onRefresh;
            ${member}
          }
        `,
      }));
      ruleTester.run('S7652', rule, { valid: cases, invalid: [] });
      ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
        valid: [],
        invalid: cases.map(test => ({ ...test, errors: 1 })),
      });
    }
  });

  it('preserves compliant public alias suppression independently of instance writes', () => {
    const cases = [
      `${angular} class C {
        onRefresh = output({ alias: 'refresh' });
        reset() { this.onRefresh = anotherEmitter; }
      }`,
      `${angular} class C {
        @Output('refresh') onRefresh = new EventEmitter<void>();
        reset() { this.onRefresh = anotherEmitter; }
      }`,
      `${angular} @Component({ outputs: ['onRefresh: refresh'] }) class C {
        onRefresh = new EventEmitter<void>();
        reset() { this.onRefresh = anotherEmitter; }
      }`,
    ].map(code => ({ code }));
    ruleTester.run('S7652', rule, { valid: cases, invalid: [] });
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: cases.map(test => ({ ...test, errors: 1 })),
    });
  });

  it('checks instance writes independently for each compatibility pair', () => {
    ruleTester.run('S7652', rule, {
      valid: [],
      invalid: [
        'constructor() { this.refresh = anotherEmitter; }',
        'reset = this.refresh = anotherEmitter;',
        'reset() { this.refresh = anotherEmitter; }',
      ].map(member => ({
        code: `${angular}
            @Component({ outputs: ['refresh', 'save'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
              /** @deprecated Use save instead. */
              onSave = output<void>();
              save = this.onSave;
              ${member}
            }
          `,
        errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier', line: 5 }],
      })),
    });
  });

  it('keeps replacement suppression limited to simple fields and alias-free metadata', () => {
    ruleTester.run('S7652', rule, {
      valid: [],
      invalid: [
        {
          code: `${angular}
            @Component({ outputs: ['onRefresh', 'refresh', 'other: changed'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = new EventEmitter<void>();
              refresh = this.onRefresh;
              other = new EventEmitter<void>();
            }
          `,
          errors: [{ messageId: 'noOutputOnPrefix', type: 'Literal' }],
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
              ['refresh'] = output<void>();
            }
          `,
          errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier' }],
        },
        {
          code: `${angular}
            @Component({ outputs: ['refresh'] })
            class C {
              refresh = this.onRefresh;
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
            }
          `,
          errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier' }],
        },
      ],
    });
  });

  it('keeps replacement decisions independent for classes with the same name', () => {
    const compliant = `
      @Component({ outputs: ['refresh'] })
      class C {
        /** @deprecated Use refresh instead. */
        onRefresh = output<void>();
        refresh = this.onRefresh;
      }
    `;
    const reportable = `
      @Component({ outputs: ['refresh', 'refresh'] })
      class C {
        /** @deprecated Use refresh instead. */
        onRefresh = output<void>();
        refresh = this.onRefresh;
      }
    `;
    ruleTester.run('S7652', rule, {
      valid: [],
      invalid: [
        {
          code: `${angular} { ${compliant} } { ${reportable} }`,
          errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier', line: 12 }],
        },
        {
          code: `${angular} { ${reportable} } { ${compliant} }`,
          errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier', line: 5 }],
        },
      ],
    });
  });

  it('checks each deprecated output and preserves replacement ordering', () => {
    ruleTester.run('S7652', rule, {
      valid: [],
      invalid: [
        {
          code: `${angular}
            @Component({ outputs: ['refresh', 'save'] })
            class C {
              save = this.onSave;
              /** @deprecated Use refresh instead. */
              onRefresh = output<void>();
              refresh = this.onRefresh;
              /** @deprecated Use save instead. */
              onSave = output<void>();
            }
          `,
          errors: [{ messageId: 'noOutputOnPrefix', type: 'Identifier', line: 9 }],
        },
      ],
    });
  });

  it('normalizes whitespace in deprecated output metadata without ignoring duplicate names', () => {
    const cases = [
      { outputs: "[' refresh ']", initializer: 'output<void>()' },
      { outputs: "['onRefresh', ' refresh ']", initializer: 'new EventEmitter<void>()' },
      { outputs: "['onRefresh ', ' refresh ']", initializer: 'new EventEmitter<void>()' },
    ].map(({ outputs, initializer }) => ({
      code: `${angular}
        @Component({ outputs: ${outputs} })
        class C {
          /** @deprecated Use refresh instead. */
          onRefresh = ${initializer};
          refresh = this.onRefresh;
        }
      `,
    }));
    ruleTester.run('S7652', rule, { valid: cases, invalid: [] });
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: cases.map(test => ({ ...test, errors: 1 })),
    });

    ruleTester.run('S7652', rule, {
      valid: [],
      invalid: [
        { outputs: "['refresh', ' refresh ']", initializer: 'output<void>()', errors: 1 },
        {
          outputs: "['onRefresh', 'refresh', ' refresh ']",
          initializer: 'new EventEmitter<void>()',
          errors: 1,
        },
        {
          outputs: "['onRefresh', ' onRefresh ', 'refresh']",
          initializer: 'new EventEmitter<void>()',
          errors: 2,
        },
      ].map(({ outputs, initializer, errors }) => ({
        code: `${angular}
          @Component({ outputs: ${outputs} })
          class C {
            /** @deprecated Use refresh instead. */
            onRefresh = ${initializer};
            refresh = this.onRefresh;
          }
        `,
        errors,
      })),
    });
  });

  it('checks metadata exposure independently for each deprecated output', () => {
    const fields = `class C {
      /** @deprecated Use refresh instead. */
      onRefresh = new EventEmitter<void>();
      refresh = this.onRefresh;
      /** @deprecated Use save instead. */
      onSave = new EventEmitter<void>();
      save = this.onSave;
    }`;
    ruleTester.run('S7652', rule, {
      valid: [
        {
          code: `${angular}
            @Component({ outputs: ['onRefresh', 'refresh', 'onSave', 'save'] })
            ${fields}
          `,
        },
      ],
      invalid: [
        {
          code: `${angular}
            @Component({ outputs: ['onRefresh', 'refresh', 'onSave', 'save', 'onSave'] })
            ${fields}
          `,
          errors: [
            { messageId: 'noOutputOnPrefix', type: 'Literal' },
            { messageId: 'noOutputOnPrefix', type: 'Literal' },
          ],
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
