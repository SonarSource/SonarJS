/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import path from 'node:path/posix';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { analyzeCSS } from '../../src/analysis/analyzer.js';
import { CssAnalysisInput } from '../../src/analysis/analysis.js';
import { readFile, normalizeToAbsolutePath } from '../../../shared/src/helpers/files.js';
import { RuleConfig } from '../../src/linter/config.js';
import type { ShouldIgnoreFileParams } from '../../../shared/src/helpers/filter/filter.js';
import { DEFAULT_FILE_SUFFIXES } from '../../../shared/src/helpers/configuration.js';

const rules = [{ key: 'block-no-empty', configurations: [] }];

const defaultShouldIgnoreParams: ShouldIgnoreFileParams = {
  jsTsExclusions: [],
  detectBundles: false,
  maxFileSize: 1000,
  ...DEFAULT_FILE_SUFFIXES,
};

describe('analyzeCSS', () => {
  it('should analyze a css file', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'file.css');
    await expect(
      analyzeCSS(await input(filePath, undefined, rules), defaultShouldIgnoreParams),
    ).resolves.toEqual(
      expect.objectContaining({
        issues: [
          {
            ruleId: 'block-no-empty',
            language: 'css',
            line: 1,
            column: 2,
            endLine: 1,
            endColumn: 4,
            message: 'Unexpected empty block',
          },
        ],
      }),
    );
  });

  it('should analyze css content', async () => {
    const fileContent = 'p {}';
    await expect(
      analyzeCSS(await input('/some/fake/path', fileContent, rules), defaultShouldIgnoreParams),
    ).resolves.toEqual(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            ruleId: 'block-no-empty',
          }),
        ],
      }),
    );
  });

  it('should still parse and compute metrics/highlighting with no rules', async () => {
    const fileContent = 'a { color: red; }';
    const result = await analyzeCSS(
      await input('/some/fake/path', fileContent, []),
      defaultShouldIgnoreParams,
    );

    expect(result.metrics?.ncloc.length).toBeGreaterThan(0);
    expect(result.highlights?.length).toBeGreaterThan(0);
  });

  it('should analyze sass syntax', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'file.sass');
    await expect(
      analyzeCSS(
        await input(filePath, undefined, [
          { key: 'selector-pseudo-element-no-unknown', configurations: [] },
        ]),
        defaultShouldIgnoreParams,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            ruleId: 'selector-pseudo-element-no-unknown',
          }),
        ],
      }),
    );
  });

  it('should analyze less syntax', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'file.less');
    await expect(
      analyzeCSS(await input(filePath, undefined, rules), defaultShouldIgnoreParams),
    ).resolves.toEqual(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            ruleId: 'block-no-empty',
          }),
        ],
      }),
    );
  });

  it('should return a parsing error in the form of an issue', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'malformed.css');
    await expect(analyzeCSS(await input(filePath), defaultShouldIgnoreParams)).resolves.toEqual({
      issues: [
        {
          ruleId: 'CssSyntaxError',
          language: 'css',
          line: 2,
          column: 2,
          message: 'Unclosed block',
        },
      ],
    });
  });
});

describe('should emit correctly located issues regardless of invisible characters', () => {
  const testCases = [
    ['single', [5, 1]],
    ['multiple', [7, 3]],
  ] as const;

  for (const [type, expectation] of testCases) {
    const candidates: Array<number | [from: number, to: number]> = [[8192, 8207]];

    for (const candidate of candidates) {
      const executeTest = async (characterCode: number) => {
        const hexadecimalRepresentation = characterCode.toString(16);

        it(`${type} character(s) 0x${hexadecimalRepresentation}`, async () => {
          const character = String.fromCodePoint(characterCode);
          const analysisInput: CssAnalysisInput = {
            fileContent:
              type === 'single'
                ? `body {
  color: orangered;
}
${character}
${character}.foo {`
                : `body {
  color: orangered;
}
${character}
${character}
${character}
${character}${character}${character}.foo {`,
            rules,
            filePath: normalizeToAbsolutePath('foo.css'),
            sonarlint: false,
          };

          await expect(analyzeCSS(analysisInput, defaultShouldIgnoreParams))
            .resolves.toEqual({
              issues: [
                {
                  ruleId: 'CssSyntaxError',
                  language: 'css',
                  line: expectation[0],
                  column: expectation[1],
                  message: 'Unclosed block',
                },
              ],
            })
            .catch(error => {
              throw error;
            });
        });
      };

      const [from, to] = typeof candidate === 'number' ? [candidate, candidate] : candidate;

      for (let i = from; i <= to; i++) {
        executeTest(i);
      }
    }
  }
});

async function input(
  filePath: string,
  fileContent?: string,
  rules: RuleConfig[] = [],
): Promise<CssAnalysisInput> {
  const normalizedPath = normalizeToAbsolutePath(filePath);
  return {
    filePath: normalizedPath,
    fileContent: fileContent || (await readFile(normalizedPath)),
    rules,
    sonarlint: false,
  };
}
