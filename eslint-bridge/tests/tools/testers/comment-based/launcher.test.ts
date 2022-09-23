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
import { Linter, Rule, RuleTester } from 'eslint';
import { rules as reactESLintRules } from 'eslint-plugin-react';
import { rules as typescriptESLintRules } from '@typescript-eslint/eslint-plugin';
import { rules as internalRules } from 'linting/eslint';
import { decorators, RuleDecorator } from 'linting/eslint/rules/decorators';
import { hasSonarRuntimeOption } from 'linting/eslint/linter/parameters';
import { buildSourceCode, Language } from 'parsing/jsts';
import {FileType, readFile} from 'helpers';
import { extractExpectations } from './framework';

const fixtures = path.join(__dirname, '../../../linting/eslint/rules/comment-based');

/**
 * Return test files for specific rule based on rule key
 * Looks for files like
 * - fixtures/rule.ts
 * - fixtures/rule.js
 * - fixtures/rule/anything
 * @param rule - rule key
 */
async function testFilesForRule(rule: string): Promise<string[]> {
  const files = [];
  for (const ext of ['js', 'jsx', 'ts', 'tsx']) {
    const p = path.join(fixtures, `${rule}.${ext}`);
    if (fs.existsSync(p)) {
      files.push(p);
    }
  }
  return files;
}

async function runRuleTests(
  internal: Record<string, Rule.RuleModule>,
  external: Record<string, Rule.RuleModule>,
  decorators: Record<string, RuleDecorator>,
  ruleTester: RuleTester,
) {
  const rules = [...Object.keys(internal), ...Object.keys(decorators)];
  for (const rule of rules) {
    const files = await testFilesForRule(rule);
    if (files.length === 0) {
      continue;
    }
    describe(`Running comment-based tests for rule ${rule}`, () => {
      files.forEach(async filename => {
        const ruleModule = rule in internal ? internal[rule] : decorators[rule](external[rule]);
        const code = await readFile(filename);
        const errors = extractExpectations(code, hasSonarRuntimeOption(ruleModule, rule));
        const tests = {
          valid: [],
          invalid: [{ code, errors, filename }],
        };
        ruleTester.run(filename, ruleModule, tests);
      });
    });
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
  if (['ts', 'tsx'].includes(ext)) {
    return 'ts';
  } else {
    return 'js';
  }
}

/**
 * Loading the above parseForESLint() function.
 */
const ruleTester = new RuleTester({ parser: __filename });
const externalRules = {
  ...Object.fromEntries(new Linter().getRules()),
  ...reactESLintRules,
  ...typescriptESLintRules,
};

Promise.resolve(runRuleTests(internalRules, externalRules, decorators, ruleTester)).catch(() => {});
