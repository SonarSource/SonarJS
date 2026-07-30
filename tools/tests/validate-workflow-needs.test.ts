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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import {
  formatBlockingNeeds,
  getBlockingNeeds,
  parseNeedsContext,
} from '../validate-workflow-needs.mjs';

describe('validate workflow needs', () => {
  it('should parse a serialized needs context', () => {
    expect(
      parseNeedsContext(
        JSON.stringify({
          build: { result: 'success' },
          test_eslint_plugin: { result: 'failure' },
        }),
      ),
    ).toEqual({
      build: { result: 'success' },
      test_eslint_plugin: { result: 'failure' },
    });
  });

  it('should reject non-object needs contexts', () => {
    expect(() => parseNeedsContext('[]')).toThrow('NEEDS_CONTEXT must decode to an object');
    expect(() => parseNeedsContext('null')).toThrow('NEEDS_CONTEXT must decode to an object');
  });

  it('should keep only failure and cancelled upstream jobs', () => {
    expect(
      getBlockingNeeds({
        build: { result: 'success' },
        generated_files_freshness: { result: 'skipped' },
        test_eslint_plugin: { result: 'failure' },
        qa_windows: { result: 'cancelled' },
        malformed: {},
      }),
    ).toEqual([
      { jobId: 'test_eslint_plugin', result: 'failure' },
      { jobId: 'qa_windows', result: 'cancelled' },
    ]);
  });

  it('should format a clear blocking summary', () => {
    expect(
      formatBlockingNeeds([
        { jobId: 'test_eslint_plugin', result: 'failure' },
        { jobId: 'plugin_qa_win', result: 'cancelled' },
      ]),
    ).toBe(
      'Promotion is blocked because required upstream jobs did not complete successfully:\n' +
        '- test_eslint_plugin: failure\n' +
        '- plugin_qa_win: cancelled',
    );
  });
});
