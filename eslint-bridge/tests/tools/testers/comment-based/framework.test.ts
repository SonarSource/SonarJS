/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import { extractExpectations } from './framework';
import { readFileSync } from 'fs';

describe('Comment-based Testing Framework', () => {
  const baseDir = path.resolve(`${__dirname}/fixtures`);

  function assertions(filename: string, usesSecondaryLocations = false) {
    const filePath = path.join(baseDir, filename);
    const code = readFileSync(filePath, { encoding: 'utf8' });
    return extractExpectations(code, usesSecondaryLocations);
  }

  it('non compliant', () => {
    expect(assertions('non_compliant.js')).toEqual([{ line: 1 }]);
  });

  it('issue message', () => {
    expect(assertions('message.js')).toEqual([{ line: 1, message: 'Expected error message' }]);
  });

  it('multiple issue message', () => {
    expect(assertions('multiple.js')).toEqual([
      { line: 1, message: 'Expected error message 1' },
      { line: 1, message: 'Expected error message 2' },
    ]);
  });

  it('issue count', () => {
    expect(assertions('count.js')).toEqual([{ line: 1 }, { line: 1 }]);
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
        column: 7,
        endColumn: 10,
        endLine: 1,
        line: 1,
        message: 'Rule message',
      },
    ]);
  });

  it('secondary', () => {
    expect(assertions('secondary.js', true)).toEqual([
      {
        column: 7,
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
              endColumn: 9,
              endLine: 1,
            },
            {
              message: 'Secondary location message2',
              column: 6,
              line: 5,
              endColumn: 9,
              endLine: 5,
            },
          ],
        }),
      },
    ]);
  });

  it('missing secondary', () => {
    expect(assertions('missing_secondary.js', true)).toEqual(
      expect.arrayContaining([
        {
          line: 6,
          message: JSON.stringify({
            message: 'Rule message',
            secondaryLocations: [],
          }),
        },
      ]),
    );
  });

  it('line adjustment', () => {
    expect(assertions('adjustment.js', true)).toEqual([
      {
        line: 2,
      },
      {
        column: 7,
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
              endColumn: 12,
              endLine: 4,
            },
            {
              message: 'Secondary location message2',
              column: 12,
              line: 4,
              endColumn: 13,
              endLine: 4,
            },
          ],
        }),
      },
    ]);
  });

  it('issue merging', () => {
    expect(assertions('merge.js')).toEqual([
      { line: 3 },
      { line: 3 },
      {
        column: 7,
        endColumn: 10,
        endLine: 7,
        line: 7,
      },
      {
        column: 7,
        endColumn: 10,
        endLine: 7,
        line: 7,
      },
    ]);
  });

  it('ignoring comment', () => {
    expect(assertions('ignored.js')).toEqual([]);
  });

  it('unexpected character', () => {
    expect(() => assertions('unexpected.js')).toThrow("Unexpected character 'u' found at 2:10");
  });

  it('conflictual primary', () => {
    expect(() => assertions('conflict.js')).toThrow(
      'Primary location conflicts with another primary location at (1:12,1:15)',
    );
  });

  it('orphan location', () => {
    expect(() => assertions('orphan0.js')).toThrow(
      'Primary location does not have a related issue at (1:7,1:10)',
    );
    expect(() => assertions('orphan1.js')).toThrow(
      "Secondary location '<' without previous primary location at (1:6,1:9)",
    );
    expect(() => assertions('orphan2.js')).toThrow(
      "Secondary location '>' without next primary location at (1:6,1:9)",
    );
  });

  it('comments parsing ambiguity', () => {
    expect(assertions('parsing.js')).toEqual([{ line: 1 }]);
  });
});
