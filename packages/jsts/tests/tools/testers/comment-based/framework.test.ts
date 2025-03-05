/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import path from 'path';
import { extractExpectations } from './framework.js';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile } from '../../../../../shared/src/helpers/files.js';

describe('Comment-based Testing Framework', () => {
  const baseDir = path.resolve(`${import.meta.dirname}/fixtures`);

  async function assertions(filename: string, usesSecondaryLocations = false) {
    const filePath = path.join(baseDir, filename);
    const code = await readFile(filePath);
    return extractExpectations(code, filePath, usesSecondaryLocations);
  }

  it('non compliant', async () => {
    expect(await assertions('non_compliant.js')).toMatchObject({ errors: [{ line: 1 }] });
  });

  it('issue message', async () => {
    expect(await assertions('message.js')).toMatchObject({
      errors: [{ line: 1, message: 'Expected error message' }],
    });
  });

  it('multiple issue message', async () => {
    expect(await assertions('multiple.js')).toMatchObject({
      errors: [
        { line: 1, message: 'Expected error message 1' },
        { line: 1, message: 'Expected error message 2' },
      ],
    });
  });

  it('primary', async () => {
    expect(await assertions('primary.js')).toMatchObject({
      errors: [
        {
          column: 7,
          endColumn: 10,
          endLine: 1,
          line: 1,
          message: 'Rule message',
        },
      ],
    });
  });

  it('secondary', async () => {
    expect(await assertions('secondary.js', true)).toMatchObject({
      errors: [
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
      ],
    });
  });

  it('missing secondary', async () => {
    expect(await assertions('missing_secondary.js', true)).toMatchObject({
      errors: expect.arrayContaining([
        {
          line: 6,
          message: JSON.stringify({
            message: 'Rule message',
            secondaryLocations: [],
          }),
        },
      ]),
    });
  });

  it('line adjustment', async () => {
    expect(await assertions('adjustment.js', true)).toMatchObject({
      errors: [
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
      ],
    });
  });

  it('issue merging', async () => {
    expect(await assertions('merge.js')).toMatchObject({
      errors: [
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
      ],
    });
  });

  it('ignoring comment', async () => {
    const result = await assertions('ignored.js').catch(err => err);
    expect(result).toMatchObject({ errors: [] });
  });

  it('unexpected character', async () => {
    const error = await assertions('unexpected.js').catch(err => err);
    expect(error.message).toEqual("Unexpected character 'u' found at 2:10");
  });

  it('conflictual primary', async () => {
    const error = await assertions('conflict.js').catch(err => err);
    expect(error.message).toEqual(
      'Primary location conflicts with another primary location at (1:12,1:15)',
    );
  });

  it('allows secondary without specific primary location', async () => {
    const result = await assertions('secondary_no_primary_range.js', true).catch(err => err);
    const sonarData = {
      message: 'Rule message',
      secondaryLocations: [
        {
          message: 'Secondary location message1',
          column: 6,
          line: 1,
          endColumn: 9,
          endLine: 1,
        },
      ],
    };
    expect(result).toEqual({
      errors: [
        {
          line: 3,
          message: JSON.stringify(sonarData),
        },
      ],
      output: null,
    });
  });

  it('orphan location', async () => {
    let error = await assertions('orphan0.js').catch(err => err);
    expect(error.message).toEqual('Primary location does not have a related issue at (1:7,1:10)');
    error = await assertions('orphan1.js').catch(err => err);
    expect(error.message).toEqual(
      "Secondary location '<' without previous primary location at (1:6,1:9)",
    );
    error = await assertions('orphan2.js').catch(err => err);
    expect(error.message).toEqual(
      "Secondary location '>' without next primary location at (1:6,1:9)",
    );
  });

  it('comments parsing ambiguity', async () => {
    const result = await assertions('parsing.js');
    expect(result).toMatchObject({ errors: [{ line: 1 }] });
  });

  it('quickfix', () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// fix@qf {{description}}
// edit@qf {{fixed.code();}}`;
    expect(extractExpectations(code, '', false)).toMatchObject({
      errors: [
        {
          line: 2,
          suggestions: [
            {
              desc: 'description',
              output: `
fixed.code();// Noncompliant [[qf]]
// fix@qf {{description}}
// edit@qf {{fixed.code();}}`,
            },
          ],
        },
      ],
    });
  });

  it('wrong quickfix id', () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// fix@qf1 {{description}}`;
    expect(() => extractExpectations(code, '', false)).toThrow(/Unexpected quickfix ID 'qf1'/);
  });

  it('quickfix id already declared', () => {
    const code = `wrong.code();// Noncompliant [[qf, qf]]`;
    expect(() => extractExpectations(code, '', false)).toThrow(
      'QuickFix ID qf has already been declared',
    );
  });

  it('quickfix wrong end column', () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// edit@qf [[ec=20]] {{fixed.code();}}`;
    expect(() => extractExpectations(code, '', false)).toThrow(
      /End column cannot be in \/\/ Noncompliant comment/,
    );
  });

  it('quickfix end below start column', () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// edit@qf [[ec=2;sc=10]] {{fixed.code();}}`;
    expect(() => extractExpectations(code, '', false)).toThrow(
      /End column cannot be lower than start position/,
    );
  });

  it('quickfix with start and end column', () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// edit@qf [[ec=10;sc=6]] {{smelly.buggy.code}}`;
    expect(extractExpectations(code, '', false)).toMatchObject({
      errors: [
        {
          line: 2,
          suggestions: [
            {
              output: `
wrong.smelly.buggy.code();// Noncompliant [[qf]]
// edit@qf [[ec=10;sc=6]] {{smelly.buggy.code}}`,
            },
          ],
        },
      ],
    });
  });

  it('quickfix with 2 suggestions in same issue', () => {
    const code = `
wrong.code();// Noncompliant [[qf1,qf2=0]]
// edit@qf1 [[ec=5]] {{fixed}}
// edit@qf2 [[ec=5]] {{repaired}}`;
    expect(extractExpectations(code, '', false)).toMatchObject({
      errors: [
        {
          line: 2,
          suggestions: [
            {
              output: `
fixed.code();// Noncompliant [[qf1,qf2=0]]
// edit@qf1 [[ec=5]] {{fixed}}
// edit@qf2 [[ec=5]] {{repaired}}`,
            },
            {
              output: `
repaired.code();// Noncompliant [[qf1,qf2=0]]
// edit@qf1 [[ec=5]] {{fixed}}
// edit@qf2 [[ec=5]] {{repaired}}`,
            },
          ],
        },
      ],
    });
  });

  it('autofix with multiple edits', () => {
    const code = `
wrong.code();// Noncompliant [[qf!]]

//comment to remove
// edit@qf [[ec=5]] {{fixed}}
// add@qf@+1 {{better.code();}}
// del@qf@+2

bad.code();// Noncompliant [[qf2!]]

//another comment to remove
// edit@qf2 [[ec=3]] {{good}}
// add@qf2@+1 {{super.code();}}
// del@qf2@+2
`;
    expect(extractExpectations(code, '', false)).toMatchObject({
      output: `
fixed.code();// Noncompliant [[qf!]]
better.code();

// edit@qf [[ec=5]] {{fixed}}
// add@qf@+1 {{better.code();}}
// del@qf@+2

good.code();// Noncompliant [[qf2!]]
super.code();

// edit@qf2 [[ec=3]] {{good}}
// add@qf2@+1 {{super.code();}}
// del@qf2@+2
`,
    });
  });
});
