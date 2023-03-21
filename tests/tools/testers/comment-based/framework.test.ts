/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { readFile } from 'helpers';

describe('Comment-based Testing Framework', () => {
  const baseDir = path.resolve(`${__dirname}/fixtures`);

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

  it('issue count', async () => {
    expect(await assertions('count.js')).toMatchObject({ errors: [{ line: 1 }, { line: 1 }] });
  });

  it('mixing message and count', async () => {
    const error = await assertions('mix.js').catch(err => err);
    expect(error.message).toEqual(
      'Error, you can not specify issue count and messages at line 1, you have to choose either:' +
        '\n  Noncompliant 2\nor\n  Noncompliant {{Expected error message}}\n',
    );
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

  it('quickfix', async () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// fix@qf {{description}}
// edit@qf {{fixed.code();}}`;
    expect(await extractExpectations(code, '', false)).toMatchObject({
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

  it('wrong quickfix id', async () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// fix@qf1 {{description}}`;
    await expect(() => extractExpectations(code, '', false)).rejects.toMatchObject({
      message: expect.stringMatching(/Unexpected quickfix ID 'qf1'/),
    });
  });

  it('quickfix id already declared', async () => {
    const code = `wrong.code();// Noncompliant [[qf, qf]]`;
    await expect(() => extractExpectations(code, '', false)).rejects.toMatchObject({
      message: 'QuickFix ID qf has already been declared',
    });
  });

  it('quickfix wrong end column', async () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// edit@qf [[ec=20]] {{fixed.code();}}`;
    await expect(() => extractExpectations(code, '', false)).rejects.toMatchObject({
      message: expect.stringMatching(/End column cannot be in \/\/ Noncompliant comment/),
    });
  });

  it('quickfix end below start column', async () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// edit@qf [[ec=2;sc=10]] {{fixed.code();}}`;
    await expect(() => extractExpectations(code, '', false)).rejects.toMatchObject({
      message: expect.stringMatching(/End column cannot be lower than start position/),
    });
  });

  it('quickfix with start and end column', async () => {
    const code = `
wrong.code();// Noncompliant [[qf]]
// edit@qf [[ec=10;sc=6]] {{smelly.buggy.code}}`;
    expect(await extractExpectations(code, '', false)).toMatchObject({
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

  it('quickfix with 2 suggestions in same issue', async () => {
    const code = `
wrong.code();// Noncompliant [[qf1,qf2=0]]
// edit@qf1 [[ec=5]] {{fixed}}
// edit@qf2 [[ec=5]] {{repaired}}`;
    expect(await extractExpectations(code, '', false)).toMatchObject({
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

  it('autofix with multiple edits', async () => {
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
    expect(await extractExpectations(code, '', false)).toMatchObject({
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
