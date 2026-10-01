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

  it('uses explicit, compliant public output aliases', () => {
    ruleTester.run('S7652', rule, {
      valid: [
        {
          code: `${angular} class C { onRefresh = output({ alias: 'refresh' }); }`,
        },
        {
          code: `import { output as createOutput } from '@angular/core'; class C { onRefresh = createOutput({ alias: 'refresh' }); }`,
        },
        {
          // The delegated rule allows lowercase words starting with "on".
          code: `${angular} class C { onRefresh = output({ alias: 'online' }); }`,
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
          code: `${angular} class C { @Output(name) onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output('onSave') onRefresh = new EventEmitter(); }`,
          errors: 2,
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

  it('relies on the upstream rule reporting the suppressed forms', () => {
    ruleTester.run('no-output-on-prefix', upstreamRules['no-output-on-prefix'], {
      valid: [],
      invalid: [
        {
          code: `${angular} class C { onRefresh = output({ alias: 'refresh' }); }`,
          errors: 1,
        },
        {
          code: `${angular} class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `${angular} @Component({ outputs: ['onRefresh: refresh'] }) class C {}`,
          errors: 1,
        },
        {
          code: `${angular} @Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: refresh'] }] }) class C {}`,
          errors: 1,
        },
      ],
    });
  });
});
