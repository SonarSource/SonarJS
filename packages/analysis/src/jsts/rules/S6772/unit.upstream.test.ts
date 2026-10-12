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
import { rule } from './index.js';
import { rules } from '../external/react.js';
import { Linter, type Rule } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('S6772 upstream spacing behavior', () => {
  it('keeps the restored next-element report aligned with upstream', () => {
    const linter = new Linter();
    const upstream = rules['jsx-child-element-spacing'];
    const verify = (code: string, candidate: Rule.RuleModule) =>
      linter.verify(code, {
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { react: { rules: { spacing: candidate } } },
        rules: { 'react/spacing': 'error' },
      });

    for (const punctuation of ['.', ',']) {
      for (const newline of ['\n', '\r\n']) {
        for (const text of [punctuation, `${punctuation} Next words`]) {
          const nextBoundary = `${newline}  ${text}${newline}  <em>continue</em></p>`;
          const code = `<p><strong>Hello</strong>${nextBoundary}`;
          const expected = verify(`<p>${nextBoundary}`, upstream);

          assert.deepEqual(
            expected.map(message => message.messageId),
            ['spacingBeforeNext'],
          );
          assert.deepEqual(
            verify(code, upstream).map(message => message.messageId),
            ['spacingAfterPrev'],
          );
          assert.deepEqual(verify(code, rule), expected);
        }
      }
    }
  });
});
