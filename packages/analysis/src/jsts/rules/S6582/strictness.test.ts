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
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { isStrictCompilerOptionEnabled } from 'ts-api-utils';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';
import { createProgramOptions } from '../../program/tsconfig/options.js';
import { getTypeScriptVersionSignal } from '../helpers/dependency-manifests/dependencies.js';
import { rule } from './rule.js';

// The analyzer uses its bundled compiler for both TS5 and TS6 projects.
// Project dependencies determine which strictness defaults the analyzer supplies.
describe('S6582 project strictness matrix', () => {
  const profiles = [
    { name: 'strict', flags: { strict: true }, enabled: true },
    { name: 'strict-null-checks', flags: { strictNullChecks: true }, enabled: true },
    { name: 'fallback', flags: {}, enabled: undefined },
    { name: 'not-strict', flags: { strict: false }, enabled: false },
    { name: 'no-strict-null-checks', flags: { strictNullChecks: false }, enabled: false },
    {
      name: 'strict-with-null-checks-disabled',
      flags: { strict: true, strictNullChecks: false },
      enabled: false,
    },
    {
      name: 'not-strict-with-null-checks-enabled',
      flags: { strict: false, strictNullChecks: true },
      enabled: true,
    },
  ];
  for (const version of [5, 6]) {
    for (const language of ['ts', 'js']) {
      for (const profile of profiles) {
        it(`TS${version} project, ${language}, ${profile.name}`, () => {
          const baseDir = normalizeToAbsolutePath(
            path.join(
              import.meta.dirname,
              '../../../../tests/jsts/program/fixtures',
              `strictness-ts${version}`,
            ),
          );
          assert.equal(
            getTypeScriptVersionSignal(baseDir)!.replace('^', '').split('.')[0],
            String(version),
          );
          const filename = normalizeToAbsolutePath(path.join(baseDir, `s6582.${language}`));
          const code =
            language === 'ts'
              ? [
                  'function nullable(x: { p: number } | null): number | null { return x && x.p; }',
                  'function nonnullable(x: { p: number }): number { return x && x.p; }',
                  'function fallback(x: { p: number } | null): number { return (x && x.p) || 0; }',
                  "function numeric(x: number | null): string { return (x && x.toFixed()) || ''; }",
                  'function comparison(a: string[] | null, b: string[] | null) { if (!a || !b || a.length !== b.length) {} }',
                  "function uncertain(x: any) { return (x && x.constructor) || 'fallback'; }",
                  'function safeNumeric(x: number | null) { return (x && x.valueOf()) || 0; }',
                  "function safeString(x: string | null) { return (x && x.toUpperCase()) || ''; }",
                  "function uncertainAssignment(x: any) { let s: string = ''; s = x && x.p; return s; }",
                ].join('\n')
              : [
                  '/** @param {{p: number} | null} x @returns {number | null} */ function nullable(x) { return x && x.p; }',
                  '/** @param {{p: number}} x @returns {number} */ function nonnullable(x) { return x && x.p; }',
                  '/** @param {{p: number} | null} x @returns {number} */ function fallback(x) { return (x && x.p) || 0; }',
                  "/** @param {number | null} x @returns {string} */ function numeric(x) { return (x && x.toFixed()) || ''; }",
                  '/** @param {string[] | null} a @param {string[] | null} b */ function comparison(a, b) { if (!a || !b || a.length !== b.length) {} }',
                  "/** @param {any} x */ function uncertain(x) { return (x && x.constructor) || 'fallback'; }",
                  '/** @param {number | null} x */ function safeNumeric(x) { return (x && x.valueOf()) || 0; }',
                  "/** @param {string | null} x */ function safeString(x) { return (x && x.toUpperCase()) || ''; }",
                  "/** @param {any} x */ function uncertainAssignment(x) { let s = ''; s = x && x.p; return s; }",
                ].join('\n');
          const { options } = createProgramOptions(
            path.join(baseDir, `s6582-${profile.name}-${language}.json`),
            JSON.stringify({
              compilerOptions: { allowJs: true, checkJs: true, types: [], ...profile.flags },
              files: [filename],
            }),
            true,
            undefined,
            baseDir,
          );
          const enabled = profile.enabled ?? version === 6;
          assert.equal(isStrictCompilerOptionEnabled(options, 'strictNullChecks'), enabled);
          if (profile.name === 'fallback') {
            assert.equal(options.strictNullChecks, version === 5 ? false : undefined);
          }
          const host = ts.createCompilerHost(options);
          const getSourceFile = host.getSourceFile.bind(host);
          host.getSourceFile = (file, target, onError, shouldCreateNewSourceFile) =>
            normalizeToAbsolutePath(file) === filename
              ? ts.createSourceFile(file, code, target, true)
              : getSourceFile(file, target, onError, shouldCreateNewSourceFile);
          const program = ts.createProgram([filename], options, host);
          const messages = new Linter({ cwd: baseDir }).verify(
            code,
            [
              {
                files: ['**/*.ts', '**/*.js'],
                languageOptions: { parser, parserOptions: { programs: [program] } },
                plugins: { sonar: { rules: { S6582: rule } } },
                rules: { 'sonar/S6582': 'error' },
              },
            ],
            { filename },
          );
          assert.ok(
            messages.every(message => message.ruleId === 'sonar/S6582'),
            JSON.stringify(messages),
          );
          // Only effective strict null checking enables the FP remediations.
          assert.deepEqual(
            messages.map(message => message.line),
            enabled ? [2, 3, 4, 6, 7, 8, 9] : [1, 2, 3, 4, 5, 6, 7, 8, 9],
          );
          if (enabled) {
            for (const line of [4, 6, 7, 8, 9]) {
              const report = messages.find(message => message.line === line)!;
              assert.equal(report.fix, undefined);
              assert.equal(report.suggestions?.length ?? 0, 0);
            }
          }
          const uncertain = messages.find(message => message.line === 6)!;
          assert.equal(Boolean(uncertain.fix), !enabled);
          assert.equal(uncertain.suggestions?.length ?? 0, 0);
        });
      }
    }
  }
});
