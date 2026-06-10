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
import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDeprecatedSectionAndCorrectStatus } from './sync-rspec-status.js';

test('closed rules are normalized to deprecated metadata', () => {
  const metadata: Record<string, unknown> = {
    status: 'closed',
    extra: {
      replacementRules: [],
    },
  };

  const deprecatedSection = generateDeprecatedSectionAndCorrectStatus('javascript', metadata);

  assert.equal(metadata.status, 'deprecated');
  assert.equal(
    deprecatedSection,
    '<p>This rule is deprecated, and will eventually be removed.</p>\n',
  );
});

test('closed rules without replacement metadata are normalized to deprecated metadata', () => {
  const metadata: Record<string, unknown> = {
    status: 'closed',
  };

  const deprecatedSection = generateDeprecatedSectionAndCorrectStatus('javascript', metadata);

  assert.equal(metadata.status, 'deprecated');
  assert.equal(
    deprecatedSection,
    '<p>This rule is deprecated, and will eventually be removed.</p>\n',
  );
});

test('closed rules with replacements are normalized to deprecated replacement metadata', () => {
  const metadata: Record<string, unknown> = {
    status: 'closed',
    extra: {
      replacementRules: ['RSPEC-1234', '5678'],
    },
  };

  const deprecatedSection = generateDeprecatedSectionAndCorrectStatus('javascript', metadata);

  assert.equal(metadata.status, 'deprecated');
  assert.equal(
    deprecatedSection,
    '<p>This rule is deprecated; use {rule:javascript:S1234}, {rule:javascript:S5678} instead.</p>\n',
  );
});
