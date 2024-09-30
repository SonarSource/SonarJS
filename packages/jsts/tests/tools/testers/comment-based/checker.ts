/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import fs from 'fs';
import path from 'path';
import { Rule, RuleTester } from 'eslint';
import { hasSonarRuntimeOption } from '../../../../src/linter/parameters/index.js';
import { buildSourceCode } from '../../../../src/builders/index.js';
import { FileType, JsTsLanguage } from '../../../../../shared/src/index.js';
import { extractExpectations } from './framework.js';

/**
 * Checks that a rule raises the issues declared as comment-based expectations on fixture files.
 * These fixtures are to be found in the rule directory and should be named as `*.fixture.<ext>`.
 * The directory can include options (`cb.options.json`) to configure the rule behaviour.
 */
export function check(ruleId: string, ruleModule: Rule.RuleModule, ruleDir: string) {
  /**
   * Loading this file's `parseForESLint()` function into ESLint's rule tester.
   */
  const ruleTester = new RuleTester({ parser: import.meta.filename });

  const fixtures = [];
  for (const file of fs.readdirSync(ruleDir, { recursive: true })) {
    if (/\.fixture\.(js|ts|jsx|tsx|vue)$/.exec(file as string)) {
      const fixture = path.join(ruleDir, file as string);
      fixtures.push(fixture);
    }
  }

  for (const fixture of fixtures) {
    const options = extractRuleOptions(ruleDir);
    const code = fs.readFileSync(fixture, { encoding: 'utf8' }).replace(/\r?\n|\r/g, '\n');
    const { errors, output } = extractExpectations(
      code,
      fixture,
      hasSonarRuntimeOption(ruleModule, ruleId) && options.includes('sonar-runtime'),
    );

    const tests = {
      valid: [],
      invalid: [{ code, filename: fixture, errors, options, output }],
    };

    ruleTester.run(`Fixture ${fixture}`, ruleModule, tests);
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
  const tsConfigs = [path.join(import.meta.dirname, '../../../../src/rules', 'tsconfig.cb.json')];
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

function extractRuleOptions(ruleDir) {
  const options = path.join(ruleDir, 'cb.options.json');
  if (fs.existsSync(options)) {
    return JSON.parse(fs.readFileSync(options, { encoding: 'utf8' }));
  }
  return [];
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
