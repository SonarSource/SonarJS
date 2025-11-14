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
import { getQuickFixMessage } from '../../../src/linter/quickfixes/messages.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import * as ruleMetas from '../../../src/rules/metas.js';
import * as rules from '../../../src/rules/rules.js';

describe('messages', () => {
  it('should return a quick fix message', () => {
    expect(getQuickFixMessage('S1537')).toEqual('Remove this trailing comma');
  });

  it('should fail returning a quick fix message for an unknown rule', () => {
    expect(() => getQuickFixMessage('no-such-rule')).toThrow(
      `Missing message for quick fix 'no-such-rule'`,
    );
  });

  it('should have a quick fix message for all rules with quickfixes', () => {
    for (const [key, meta] of Object.entries(ruleMetas)) {
      if (meta.meta.fixable && !rules[key].meta.hasSuggestions) {
        expect(getQuickFixMessage(key)).toBeDefined();
      }
    }
  });
});
