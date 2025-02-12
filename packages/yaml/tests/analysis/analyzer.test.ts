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
import { join } from 'path';
import type { Rule } from 'eslint';
import { describe, it, before } from 'node:test';
import { expect } from 'expect';
import { setContext } from '../../../shared/src/helpers/context.js';
import { parseAwsFromYaml } from '../../src/aws/parser.js';
import { analyzeEmbedded } from '../../../jsts/src/embedded/analysis/analyzer.js';
import { APIError } from '../../../shared/src/errors/error.js';
import { initializeLinter } from '../../../jsts/src/linter/linters.js';
import { rules } from '../../../jsts/src/linter/wrapper.js';
import { composeSyntheticFilePath } from '../../../jsts/src/embedded/builder/build.js';
import { embeddedInput } from '../../../jsts/tests/tools/helpers/input.js';

describe('analyzeYAML', () => {
  const fixturesPath = join(import.meta.dirname, 'fixtures');

  before(() => {
    setContext({
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: false,
      bundles: [],
    });
  });

  it('should fail on uninitialized linter', async () => {
    const input = {} as any;
    expect(() => analyzeEmbedded(input, parseAwsFromYaml)).toThrow(
      APIError.linterError('Linter default does not exist. Did you call /init-linter?'),
    );
  });

  it('should analyze YAML file', async () => {
    await initializeLinter([
      {
        key: 'S3923',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const {
      issues: [issue],
    } = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'file.yaml') }),
      parseAwsFromYaml,
    );
    expect(issue).toEqual(
      expect.objectContaining({
        ruleId: 'S3923',
        line: 8,
        column: 17,
        endLine: 8,
        endColumn: 46,
      }),
    );
  });

  it('should return an empty issues list on parsing error', async () => {
    await initializeLinter([
      {
        key: 'S3923',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const analysisInput = await embeddedInput({ filePath: join(fixturesPath, 'malformed.yaml') });
    expect(() => analyzeEmbedded(analysisInput, parseAwsFromYaml)).toThrow(
      APIError.parsingError('Map keys must be unique', { line: 2 }),
    );
  });

  it('should not break when using a rule with a quickfix', async () => {
    await initializeLinter([
      {
        key: 'S1116',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const result = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'quickfix.yaml') }),
      parseAwsFromYaml,
    );
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

  it('should not break when using "S3723" rule', async () => {
    await initializeLinter([
      {
        key: 'S3723',
        configurations: ['always-multiline'],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const { issues } = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'enforce-trailing-comma.yaml') }),
      parseAwsFromYaml,
    );
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
    await initializeLinter([
      {
        key: 'S2251',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const result = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'secondary.yaml') }),
      parseAwsFromYaml,
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
      column: 34,
      endLine: 7,
      endColumn: 52,
    });
  });

  it('should not break when using a regex rule', async () => {
    await initializeLinter([
      {
        key: 'S6326',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const result = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'regex.yaml') }),
      parseAwsFromYaml,
    );
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
    await initializeLinter([
      {
        key: 'S1131',
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
      {
        key: 'S1451',
        configurations: [{ headerFormat: '' }],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    const { issues } = analyzeEmbedded(
      await embeddedInput({ filePath: join(fixturesPath, 'outside.yaml') }),
      parseAwsFromYaml,
    );
    expect(issues).toHaveLength(0);
  });

  it('should provide a synthetic filename to the rule context', async () => {
    const resourceName = 'SomeLambdaFunction';
    const filePath = join(fixturesPath, 'synthetic-filename.yaml');
    const syntheticFilename = composeSyntheticFilePath(filePath, resourceName);
    const rule = {
      key: 'synthetic-filename',
      module: {
        create(context: Rule.RuleContext) {
          return {
            Program: () => {
              expect(context.filename).toEqual(syntheticFilename);
            },
          };
        },
      },
    };
    rules[rule.key] = rule.module;
    await initializeLinter([
      {
        key: rule.key,
        configurations: [],
        fileTypeTarget: ['MAIN'],
        language: 'js',
        analysisModes: ['DEFAULT'],
      },
    ]);
    analyzeEmbedded(await embeddedInput({ filePath }), parseAwsFromYaml);
  });
});
