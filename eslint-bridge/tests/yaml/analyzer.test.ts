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
import { analyzeYaml, initLinter } from 'analyzer';
import { setContext } from 'context';
import { ParseExceptionCode } from 'parser';

describe('analyzeYaml()', () => {
  const fixturesPath = join(__dirname, '../fixtures/yaml');

  beforeAll(() => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
    });
  });

  it('should analyze YAML file', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const {
      issues: [issue],
    } = await analyzeYaml({
      filePath: join(fixturesPath, 'valid-lambda.yaml'),
      fileContent: undefined,
      fileType: 'MAIN',
      tsConfigs: [],
    });
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'no-all-duplicated-branches',
        line: 8,
        column: 17,
        endLine: 8,
        endColumn: 46,
      }),
    );
  });

  it('should return an empty issues list on parsing error', async () => {
    initLinter([
      { key: 'no-all-duplicated-branches', configurations: [], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues, parsingError } = await analyzeYaml({
      filePath: join(fixturesPath, 'invalid-yaml.yaml'),
      fileContent: undefined,
      tsConfigs: [],
      fileType: 'MAIN',
    });
    expect(issues).toHaveLength(0);
    expect(parsingError).toHaveProperty('code', ParseExceptionCode.Parsing);
    expect(parsingError).toHaveProperty('line', 2);
    expect(parsingError).toHaveProperty('message', 'Map keys must be unique');
  });

  it('should not break when using a rule with a quickfix', async () => {
    initLinter([{ key: 'no-extra-semi', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const result = await analyzeYaml({
      filePath: join(fixturesPath, 'valid-serverless-quickfix.yaml'),
      fileContent: undefined,
      fileType: 'MAIN',
      tsConfigs: [],
    });
    const {
      issues: [
        {
          quickFixes: [quickFix],
        },
      ],
    } = result;
    expect(quickFix.edits).toEqual([
      {
        text: ';',
        loc: {
          line: 7,
          column: 58,
          endLine: 7,
          endColumn: 60,
        },
      },
    ]);
  });

  it('should not break when using "enforce-trailing-comma" rule', async () => {
    initLinter([
      {
        key: 'enforce-trailing-comma',
        configurations: ['always-multiline'],
        fileTypeTarget: ['MAIN'],
      },
    ]);
    const { issues } = await analyzeYaml({
      filePath: join(fixturesPath, 'fail-lambda.yaml'),
      fileContent: undefined,
      fileType: 'MAIN',
      tsConfigs: [],
    });
    expect(issues).toHaveLength(2);
    expect(issues[0]).toEqual(
      expect.objectContaining({
        line: 30,
        column: 28,
        endLine: 31,
        endColumn: 0,
      }),
    );
    expect(issues[1]).toEqual(
      expect.objectContaining({
        line: 31,
        column: 19,
        endLine: 32,
        endColumn: 0,
      }),
    );
  });

  it('should not break when using a rule with secondary locations', async () => {
    initLinter([{ key: 'no-new-symbol', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const result = await analyzeYaml({
      filePath: join(fixturesPath, 'valid-serverless-secondary.yaml'),
      fileContent: undefined,
      fileType: 'MAIN',
      tsConfigs: [],
    });
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
    initLinter([{ key: 'sonar-no-regex-spaces', configurations: [], fileTypeTarget: ['MAIN'] }]);
    const result = await analyzeYaml({
      filePath: join(fixturesPath, 'valid-serverless-regex.yaml'),
      fileContent: undefined,
      fileType: 'MAIN',
      tsConfigs: [],
    });
    const {
      issues: [issue],
    } = result;
    expect(issue).toEqual(
      expect.objectContaining({
        line: 7,
        column: 41,
        endLine: 7,
        endColumn: 44,
      }),
    );
  });

  it('should not return issues outside of the embedded JS', async () => {
    initLinter([
      { key: 'no-trailing-spaces', configurations: [], fileTypeTarget: ['MAIN'] },
      { key: 'file-header', configurations: [{ headerFormat: '' }], fileTypeTarget: ['MAIN'] },
    ]);
    const { issues } = await analyzeYaml({
      filePath: join(fixturesPath, 'trailing-spaces.yaml'),
      fileContent: undefined,
      fileType: 'MAIN',
      tsConfigs: [],
    });
    expect(issues).toHaveLength(0);
  });

  it('should not analyze without initializing the linter first', () => {
    try {
      jest.resetModules();
      const analyzer = require('../../src/analyzer');
      analyzer.analyzeYaml({
        filePath: '/fake/path',
        fileContent: 'fakeCode();',
      });
      fail('this test should throw error');
    } catch (e) {
      expect(e.message).toBe('Linter is undefined. Did you call /init-linter?');
    }
  });
});
