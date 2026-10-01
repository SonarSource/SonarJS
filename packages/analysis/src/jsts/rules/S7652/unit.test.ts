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

  it('uses explicit, compliant public output aliases', () => {
    ruleTester.run('S7652', rule, {
      valid: [
        {
          code: `class C { onRefresh = output({ alias: 'refresh' }); }`,
        },
        {
          code: `class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
        },
        {
          code: 'class C { @Output(`refresh`) onRefresh = new EventEmitter(); }',
        },
        {
          code: `@Component({ outputs: ['onRefresh: refresh'] }) class C {}`,
        },
        {
          code: `@Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: refresh'] }] }) class C {}`,
        },
      ],
      invalid: [
        {
          code: `class C { onRefresh = output(); }`,
          errors: 1,
        },
        {
          code: `class C { onRefresh = output({ alias: name }); }`,
          errors: 1,
        },
        {
          code: `class C { onRefresh = output({ alias: 'onSave' }); }`,
          errors: 2,
        },
        {
          code: `class C { @Output() onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `class C { @Output(name) onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `class C { @Output('onSave') onRefresh = new EventEmitter(); }`,
          errors: 2,
        },
        {
          code: `@Component({ outputs: ['onRefresh'] }) class C {}`,
          errors: 1,
        },
        {
          code: `@Component({ outputs: ['onRefresh: onSave'] }) class C {}`,
          errors: 1,
        },
        {
          code: `@Component({ outputs: ['onRefresh: refresh: malformed'] }) class C {}`,
          errors: 1,
        },
        {
          code: `@Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: onSave'] }] }) class C {}`,
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
          code: `class C { onRefresh = output({ alias: 'refresh' }); }`,
          errors: 1,
        },
        {
          code: `class C { @Output('refresh') onRefresh = new EventEmitter(); }`,
          errors: 1,
        },
        {
          code: `@Component({ outputs: ['onRefresh: refresh'] }) class C {}`,
          errors: 1,
        },
        {
          code: `@Directive({ hostDirectives: [{ directive: Other, outputs: ['onRefresh: refresh'] }] }) class C {}`,
          errors: 1,
        },
      ],
    });
  });
});
