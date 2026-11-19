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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { Linter } from '../../../src/jsts/linter/linter.js';
import type { RuleConfig } from '../../../src/jsts/linter/config/rule-config.js';
import { build } from '../../../src/jsts/builders/build.js';
import { jsTsInput } from '../tools/helpers/input.js';
import { normalizeToAbsolutePath } from '../../../../shared/src/helpers/files.js';

type Scenario = {
  name: string;
  key?: string;
  alias?: string;
  code?: string;
  relativePath?: string;
  ruleConfig?: Partial<RuleConfig>;
  fileType?: 'MAIN' | 'TEST';
  generated?: boolean;
  detectedEsYear?: number;
  moduleType?: 'commonjs' | 'module';
  skipUnchanged?: boolean;
  outsideProfile?: boolean;
};

const scenarios: Scenario[] = [
  { name: 'MAIN/TEST scope', fileType: 'TEST' },
  {
    name: 'test-case filename',
    key: 'S2187',
    code: 'export const helper = 1;',
    relativePath: '__tests__/helper.js',
    fileType: 'TEST',
    ruleConfig: { fileTypeTargets: ['TEST'] },
  },
  { name: 'generated source', generated: true },
  { name: 'ECMAScript version', detectedEsYear: 2009 },
  { name: 'language', ruleConfig: { language: 'ts' } },
  {
    name: 'blacklisted extension',
    relativePath: 'src/script.html',
    ruleConfig: { blacklistedExtensions: ['.html', '.htm'] },
  },
  {
    name: 'analysis mode',
    key: 'S1116',
    alias: 'no-extra-semi',
    code: 'const value = 1;;',
    skipUnchanged: true,
  },
  {
    name: 'module type',
    key: 'S7785',
    code: "fetch('/api').catch(console.error);",
    moduleType: 'commonjs',
  },
  {
    name: 'required dependency',
    key: 'S6478',
    code: 'function Parent() { function Child() { return <div />; } return <Child />; }',
    relativePath: 'fixtures/dependency-filter/no-react/src/file.jsx',
  },
  {
    name: 'React rule in Vue',
    key: 'S6478',
    code: 'export const helper = 1;',
    relativePath: 'fixtures/dependency-filter/react/src/file.vue',
  },
  { name: 'vendor file', relativePath: 'vendor/legacy.js' },
  { name: 'quality profile selection', outsideProfile: true },
];

describe('Inline rule applicability', () => {
  for (const directive of ['sonarjs/S3504', 'no-var']) {
    it(`should still configure and suppress selected rules through ${directive}`, async () => {
      const baseDir = normalizeToAbsolutePath(import.meta.dirname);
      const filePath = normalizeToAbsolutePath(path.join(baseDir, 'src/file.js'));
      await Linter.initialize({
        baseDir,
        rules: [
          {
            key: 'S3504',
            configurations: [],
            fileTypeTargets: ['MAIN'],
            language: 'js',
            analysisModes: ['DEFAULT'],
          },
        ],
      });
      for (const [comment, issueCount, suppressedCount] of [
        [`/* eslint ${directive}: "warn" */`, 1, 0],
        [`/* eslint ${directive}: "off" */`, 0, 0],
        [`// eslint-disable-next-line ${directive}`, 0, 1],
      ] as const) {
        const parsed = build(
          await jsTsInput({ filePath, fileContent: `${comment}\nvar value = 1;` }),
        );
        const result = Linter.lint(parsed, filePath);
        expect(result.issues).toHaveLength(issueCount);
        expect(result.suppressedIssues).toHaveLength(suppressedCount);
      }
    });
  }

  it('should still override parameters of a selected rule', async () => {
    const baseDir = normalizeToAbsolutePath(import.meta.dirname);
    const filePath = normalizeToAbsolutePath(path.join(baseDir, 'src/file.js'));
    await Linter.initialize({
      baseDir,
      rules: [
        {
          key: 'S107',
          configurations: [{ max: 3 }],
          fileTypeTargets: ['MAIN'],
          language: 'js',
          analysisModes: ['DEFAULT'],
        },
      ],
    });
    for (const [comment, issueCount] of [
      ['', 0],
      ['/* eslint max-params: ["error", 1] */', 1],
      ['/* eslint sonarjs/S107: ["error", { "max": 1 }] */', 1],
    ] as const) {
      const parsed = build(
        await jsTsInput({
          filePath,
          fileContent: `${comment}\nfunction foo(a, b) { return a + b; }`,
        }),
      );
      expect(Linter.lint(parsed, filePath).issues).toHaveLength(issueCount);
    }
  });

  for (const scenario of scenarios) {
    const key = scenario.key ?? 'S3504';
    const alias = scenario.alias ?? (key === 'S3504' ? 'no-var' : undefined);
    const directives = [`sonarjs/${key}`];
    if (alias) {
      directives.push(alias, `${alias}: "error", sonarjs/${key}`);
    }
    for (const directive of directives) {
      it(`should preserve ${scenario.name} with inline ${directive}`, async ({ mock }) => {
        const baseDir = normalizeToAbsolutePath(import.meta.dirname);
        const filePath = normalizeToAbsolutePath(
          path.join(baseDir, scenario.relativePath ?? 'src/file.js'),
        );
        await Linter.initialize({
          baseDir,
          isGeneratedSourceFile: () => scenario.generated ?? false,
          rules: scenario.outsideProfile
            ? []
            : [
                {
                  key,
                  configurations: [],
                  fileTypeTargets: ['MAIN'],
                  language: 'js',
                  analysisModes: ['DEFAULT'],
                  ...scenario.ruleConfig,
                },
              ],
        });
        const create = mock.method(Linter.rules[key], 'create');
        for (const comment of ['', `/* eslint ${directive}: "error" */\n`]) {
          const code = `${comment}${scenario.code ?? 'var value = 1;'}`;
          const parsed = build(
            await jsTsInput({
              filePath,
              fileContent: filePath.endsWith('.vue') ? `<script>${code}</script>` : code,
            }),
          );
          const result = Linter.lint(
            parsed,
            filePath,
            scenario.fileType ?? 'MAIN',
            scenario.skipUnchanged ? 'SAME' : 'CHANGED',
            scenario.skipUnchanged ? 'SKIP_UNCHANGED' : 'DEFAULT',
            'js',
            scenario.detectedEsYear,
            scenario.moduleType,
          );
          expect(result).toEqual({ issues: [], suppressedIssues: [] });
          expect(create.mock.callCount()).toBe(0);
        }
      });
    }
  }
});
