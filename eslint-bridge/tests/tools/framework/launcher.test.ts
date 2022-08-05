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
 * test file in the `fixtures` of the current folder. To do so, it read the file contents,
 * extracts from it the issue expectations, and use them as invalid test assertions with
 * ESLint's rule tester. To know which rule to test against a test file, the latter must
 * be named with the rule's name.
 *
 * @see package.json/ctest to test specific comment-based test files
 */

import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleTester } from 'eslint';
import { rules } from 'linting/eslint';
import { buildSourceCode } from 'parsing/jsts';
import { FileType } from 'helpers';
import { extractExpectations } from './framework';

/**
 * Return test files for specific rule based on rule key
 * Looks for files like
 * - fixtures/rule.ts
 * - fixtures/rule.js
 * - fixtures/rule/anything
 * @param rule - rule key
 */
function testFilesForRule(rule: string): string[] {
  const files = [];
  for (const ext of ['js', 'ts']) {
    const p = path.join(__dirname, '../../linting/eslint/rules/comment-based', `${rule}.${ext}`);
    if (fs.existsSync(p)) {
      files.push(p);
    }
  }
  return files;
}

function runRuleTests(rules: Record<string, Rule.RuleModule>, ruleTester: RuleTester) {
  for (const rule in rules) {
    const files = testFilesForRule(rule);
    if (files.length === 0) {
      continue;
    }
    describe(`Running comment-based tests for rule ${rule}`, () => {
      files.forEach(filename => {
        const code = fs.readFileSync(filename, { encoding: 'utf8' });
        const tests = {
          valid: [],
          invalid: [{ code, errors: extractExpectations(code), filename }],
        };
        ruleTester.run(filename, rules[rule], tests);
      });
    });
  }
}

/**
 * This function is provided as 'parseForESLint' implementation which is used in RuleTester to invoke exactly same logic
 * as we use in our 'services/analysis/analyzers/js/analyzer.ts' module
 */
export function parseForESLint(
  fileContent: string,
  options: { filePath: string },
  fileType: FileType = 'MAIN',
) {
  const { filePath } = options;
  return buildSourceCode(
    { filePath, fileContent, fileType, tsConfigs: [] },
    filePath.endsWith('.ts') ? 'ts' : 'js',
  );
}

// loading the above parseForESLint() function
const ruleTester = new RuleTester({ parser: __filename });
runRuleTests(rules, ruleTester);
