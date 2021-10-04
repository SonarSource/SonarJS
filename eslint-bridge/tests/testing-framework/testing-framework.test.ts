/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

import * as path from 'path';
import { readAssertions, Tests } from '../../src/testing-framework/assertions';

describe('Comment-based Testing Framework', () => {
  const baseDir = path.resolve(`${__dirname}/../fixtures/testing-framework`);

  it('non compliant', () => {
    expect(assertions('non_compliant.js')).toEqual([
      {
        errors: [{ line: 1 }],
      },
    ]);
  });

  it('issue message', () => {
    expect(assertions('message.js')).toEqual([
      {
        errors: [{ line: 1, message: 'Expected error message' }],
      },
    ]);
  });

  it('multiple issue message', () => {
    expect(assertions('multiple.js')).toEqual([
      {
        errors: [
          { line: 1, message: 'Expected error message 1' },
          { line: 1, message: 'Expected error message 2' },
        ],
      },
    ]);
  });

  it('issue count', () => {
    expect(assertions('count.js')).toEqual([
      {
        errors: [{ line: 1 }, { line: 1 }],
      },
    ]);
  });

  it('mixing message and count', () => {
    expect(() => assertions('mix.js')).toThrow(
      'Error, you can not specify issue count and messages at line 1, you have to choose either:' +
        '\n  Noncompliant 2\nor\n  Noncompliant {{Expected error message}}\n',
    );
  });

  it('primary', () => {
    expect(assertions('primary.js')).toEqual([
      {
        errors: [{ column: 6, endColumn: 10, endLine: 1, line: 1, message: 'Rule message' }],
      },
    ]);
  });

  it('secondary', () => {
    expect(assertions('secondary.js')).toEqual([
      {
        errors: [
          {
            column: 6,
            line: 3,
            endColumn: 10,
            endLine: 3,
            message: JSON.stringify({
              message: 'Rule message',
              secondaryLocations: [
                {
                  message: 'Secondary location message1',
                  column: 6,
                  line: 1,
                  endColumn: 10,
                  endLine: 1,
                },
                {
                  message: 'Secondary location message2',
                  column: 6,
                  line: 5,
                  endColumn: 10,
                  endLine: 5,
                },
              ],
            }),
          },
        ],
      },
    ]);
  });

  it('line adjustment', () => {
    expect(assertions('adjustment.js')).toEqual([
      {
        errors: [
          {
            line: 2,
          },
          {
            column: 6,
            endColumn: 10,
            endLine: 4,
            line: 4,
            message: JSON.stringify({
              message: 'Expected error message',
              secondaryLocations: [
                {
                  message: 'Secondary location message1',
                  column: 7,
                  line: 4,
                  endColumn: 13,
                  endLine: 4,
                },
                {
                  message: 'Secondary location message2',
                  column: 12,
                  line: 4,
                  endColumn: 14,
                  endLine: 4,
                },
              ],
            }),
          },
        ],
      },
    ]);
  });

  it('issue merging', () => {
    expect(assertions('merge.js')).toEqual([
      {
        errors: [
          { line: 3 },
          { line: 3 },
          {
            column: 6,
            endColumn: 10,
            endLine: 7,
            line: 7,
          },
          {
            column: 6,
            endColumn: 10,
            endLine: 7,
            line: 7,
          },
        ],
      },
    ]);
  });

  it('ignoring comment', () => {
    expect(assertions('ignored.js')).toEqual([
      {
        errors: [],
      },
    ]);
  });

  it('unexpected character', () => {
    expect(() => assertions('unexpected.js')).toThrow("Unexpected character 'u' found at 2:10");
  });

  it('conflictual primary', () => {
    expect(() => assertions('conflict.js')).toThrow(
      'Primary location conflicts with another primary location at (1:11,1:15)',
    );
  });

  it('orphan location', () => {
    expect(() => assertions('orphan0.js')).toThrow(
      'Primary location does not have a related issue at (1:6,1:10)',
    );
    expect(() => assertions('orphan1.js')).toThrow(
      "Secondary location '<' without previous primary location at (1:6,1:10)",
    );
    expect(() => assertions('orphan2.js')).toThrow(
      "Secondary location '>' without next primary location at (1:6,1:10)",
    );
  });

  function assertions(filename: string) {
    const filePath = path.join(baseDir, filename);
    const tests = readAssertions(filePath);
    return extractInvalidTestsCases(tests);
  }

  function extractInvalidTestsCases(tests: Tests) {
    return tests.invalid.map(testCase => {
      delete testCase.code;
      return testCase;
    });
  }
});
