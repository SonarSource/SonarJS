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
import { buildSourceCode, Language } from 'parsing/jsts';
import { FileType } from 'helpers';
import { extractExpectations } from './framework';
import { decorateExternalRules } from 'linting/eslint/linter/decoration';

const fixtures = path.join(__dirname, '../../../linting/eslint/rules/comment-based');

function runRuleTests(rules: Record<string, Rule.RuleModule>, ruleTester: RuleTester) {
  const tests = fs.readdirSync(fixtures);
  for (const test of tests) {
    const filename = path.join(fixtures, test);
    const { ext, name } = path.parse(filename);
    const rule = name.toLowerCase();
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext.toLowerCase()) && rules.hasOwnProperty(rule)) {
      describe(`Running comment-based tests for rule ${rule} ${ext}`, () => {
        const code = fs.readFileSync(filename, { encoding: 'utf8' }).replace(/\r?\n|\r/g, '\n');
        const errors = extractExpectations(code, hasSonarRuntimeOption(rules[rule], rule));
        const tests = {
          valid: [],
          invalid: [{ code, errors, filename }],
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
    languageFromFilePath(filePath),
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
 * Returns the source code's language based on the file path.
 */
function languageFromFilePath(filePath: string): Language {
  const { ext } = path.parse(filePath);
  if (['.ts', '.tsx'].includes(ext)) {
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
