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

import { join } from 'path';
import { setContext } from 'helpers';
import { analyzeHTML } from 'services/analysis';
import { initializeLinter } from 'linting/eslint';
import { APIError } from 'errors';
import { htmlInput } from '../../../../tools';

describe('analyzeHTML', () => {
  const fixturesPath = join(__dirname, 'fixtures');

  beforeAll(() => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should fail on uninitialized linter', async () => {
    const input = {} as any;
    await expect(analyzeHTML(input)).rejects.toEqual(
      APIError.linterError('Linter default does not exist. Did you call /init-linter?'),
    );
  });

  it('should analyze HTML file', async () => {
    await initializeLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const {
      issues: [issue],
    } = await analyzeHTML(await htmlInput({ filePath: join(fixturesPath, 'file.html') }));
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-all-duplicated-branches',
        line: 10,
        column: 2,
        endLine: 10,
        endColumn: 31,
      }),
    );
  });

  it('should not break when using "enforce-trailing-comma" rule', async () => {
    await initializeLinter([
      {
        key: 'enforce-trailing-comma',
        configurations: ['always-multiline'],
        fileTypeTarget: ['MAIN'],
      },
    ]);
    const { issues } = await analyzeHTML(
      await htmlInput({ filePath: join(fixturesPath, 'enforce-trailing-comma.html') }),
    );
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        line: 13,
        column: 16,
        endLine: 14,
        endColumn: 4,
      }),
    );
    expect(issues[1]).toEqual(
      expect.objectContaining({
        line: 14,
        column: 7,
        endLine: 15,
        endColumn: 4,
      }),
    );
  });

  it('should not break when using a rule with secondary locations', async () => {
    await initializeLinter([
      { key: 'no-new-symbol', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const result = await analyzeHTML(
      await htmlInput({ filePath: join(fixturesPath, 'secondary.html') }),
    );
    const {
      issues: [
        {
          secondaryLocations: [secondaryLocation],
        },
      ],
    } = result;
    expect(secondaryLocation).toEqual({
      line: 7,
      column: 35,
      endLine: 7,
      endColumn: 41,
    });
  });

  it('should not break when using a regex rule', async () => {
    await initializeLinter([
      { key: 'sonar-no-regex-spaces', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const result = await analyzeHTML(
      await htmlInput({ filePath: join(fixturesPath, 'regex.html') }),
    );
    const {
      issues: [issue],
    } = result;
    expect(issue).toEqual(
      expect.objectContaining({
        line: 10,
        column: 25,
        endLine: 10,
        endColumn: 28,
      }),
    );
  });
});
