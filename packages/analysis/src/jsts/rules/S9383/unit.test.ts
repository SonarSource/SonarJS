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
import { decorate } from './decorator.js';
import { describe, it } from 'node:test';
import { Linter } from 'eslint';
import assert from 'node:assert';
import type { Rule } from 'eslint';

describe('S9383 decorator', () => {
  it('should pass through a non-function-handler report when TypeScript parser services are unavailable', () => {
    // Exercises decorator.ts's isRequiredParserServices false branch: without a TS-aware
    // parser, isAnyTypedRejectionHandler bails out early and the report is forwarded as-is.
    const mockUpstream: Rule.RuleModule = {
      meta: {
        type: 'problem',
        hasSuggestions: true,
        messages: { floatingUselessRejectionHandler: 'upstream message' },
      },
      create(ctx) {
        return {
          CallExpression(node) {
            ctx.report({ node, messageId: 'floatingUselessRejectionHandler' });
          },
        };
      },
    };
    const decorated = decorate(mockUpstream);
    const linter = new Linter();
    const messages = linter.verify('promise.catch(next);', {
      plugins: { test: { rules: { r: decorated } } },
      rules: { 'test/r': 'error' },
    });
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].messageId, 'floatingUselessRejectionHandler');
  });
});
