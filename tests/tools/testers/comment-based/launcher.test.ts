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
/**
 * Comment-based Testing Framework Launcher
 *
 * This file provides a launcher for the Comment-based Testing Framework, which relies
 * on Jest and ESLint's rule tester. Basically, it tests the rule implementation of each
 * test file in the `fixtures` of the current folder. To do so, it reads the file contents,
 * extracts from it the issue expectations, and use them as invalid test assertions with
 * ESLint's rule tester. To know which rule to test against a test file, the latter must
 * be named with the rule's name.
 *
 * @see package.json/ctest to test specific comment-based test files
 */

import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleTester } from 'eslint';
import { rules as reactESLintRules } from 'eslint-plugin-react';
import { rules as typescriptESLintRules } from '@typescript-eslint/eslint-plugin';
import { eslintRules } from 'linting/eslint/rules/core';
import { rules as internalRules } from 'linting/eslint';
import { hasSonarRuntimeOption } from 'linting/eslint/linter/parameters';
import { buildSourceCode } from 'parsing/jsts';
import { FileType, JsTsLanguage } from 'helpers';
import { extractExpectations } from './framework';
import { decorateExternalRules } from 'linting/eslint/linter/decoration';

const fixtures = path.join(__dirname, '../../../linting/eslint/rules/comment-based');

function extractRuleOptions(testFiles, rule) {
  if (testFiles.includes(`${rule}.json`)) {
    return JSON.parse(fs.readFileSync(path.join(fixtures, `${rule}.json`), { encoding: 'utf8' }));
  }
  return [];
}

function runRuleTests(rules: Record<string, Rule.RuleModule>, ruleTester: RuleTester) {
  const testFiles = fs.readdirSync(fixtures);
  for (const testFile of testFiles) {
    const filename = path.join(fixtures, testFile);
    const { ext, name } = path.parse(filename);
    const rule = name.toLowerCase();
    if (
      ['.js', '.jsx', '.ts', '.tsx', '.vue'].includes(ext.toLowerCase()) &&
      rules.hasOwnProperty(rule)
    ) {
      describe(`Running comment-based tests for rule ${rule} ${ext}`, () => {
        const code = fs.readFileSync(filename, { encoding: 'utf8' }).replace(/\r?\n|\r/g, '\n');
        const { errors, output } = extractExpectations(
          code,
          filename,
          hasSonarRuntimeOption(rules[rule], rule),
        );
        const options = extractRuleOptions(testFiles, rule);
        const tests = {
          valid: [],
          invalid: [{ code, errors, filename, options, output }],
        };
        ruleTester.run(filename, rules[rule], tests);
      });
    }
  }
}

/**
 * This function is provided as 'parseForESLint' implementation which is used in RuleTester to invoke exactly same logic
 * as we use in our 'services/analysis/analyzer.ts' module
 */
export function parseForESLint(
  fileContent: string,
  options: { filePath: string },
  fileType: FileType = 'MAIN',
) {
  const { filePath } = options;
  const tsConfigs = [path.join(fixtures, 'tsconfig.json')];
  const sourceCode = buildSourceCode(
    { filePath, fileContent, fileType, tsConfigs },
    languageFromFile(fileContent, filePath),
  );

  /**
   * ESLint expects the parser services (including the type checker) to be available in a field
   * `services` after parsing while TypeScript ESLint returns it as `parserServices`. Therefore,
   * we need to extend the source code with this additional property so that the type checker
   * can be retrieved from type-aware rules.
   */
  return Object.create(sourceCode, {
    services: { value: sourceCode.parserServices },
  });
}

/**
 * Returns the source code's language based on the file content and path.
 */
function languageFromFile(fileContent: string, filePath: string): JsTsLanguage {
  // Keep this regex aligned with the one in JavaScriptFilePredicate.java to have the same flow
  const hasScriptTagWithLangTs = /<script[^>]+lang=['"]ts['"][^>]*>/;
  const { ext } = path.parse(filePath);
  if (
    ['.ts', '.tsx'].includes(ext) ||
    (ext === '.vue' && hasScriptTagWithLangTs.test(fileContent))
  ) {
    return 'ts';
  } else {
    return 'js';
  }
}

/**
 * Loading the above parseForESLint() function.
 */
const ruleTester = new RuleTester({ parser: __filename });
const externalRules = decorateExternalRules({
  ...eslintRules,
  ...typescriptESLintRules,
  ...reactESLintRules,
});

runRuleTests({ ...externalRules, ...internalRules }, ruleTester);
