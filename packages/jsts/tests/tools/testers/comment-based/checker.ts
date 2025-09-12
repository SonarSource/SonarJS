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
import fs from 'node:fs';
import path from 'node:path';
import { Rule, RuleTester } from 'eslint';
import { extractExpectations } from './framework.js';
import parser from './parser.js';
import { SonarMeta } from '../../../../src/rules/helpers/index.js';

/**
 * Checks that a rule raises the issues declared as comment-based expectations on fixture files.
 * These fixtures are to be found in the rule directory and should be named as `*.fixture.<ext>`.
 * The directory can include options (`cb.options.json`) to configure the rule behaviour.
 */
export function check(sonarMeta: SonarMeta, ruleModule: Rule.RuleModule, ruleDir: string) {
  /**
   * Loading this file's `parseForESLint()` function into ESLint's rule tester.
   */
  const ruleTester = new RuleTester({
    languageOptions: { parser },
    settings: { sonarRuntime: true },
  });

  const fixtures: string[] = [];
  for (const file of fs.readdirSync(ruleDir, { recursive: true })) {
    if (/\.fixture\.(js|ts|jsx|tsx|vue)$/.test(file as string)) {
      const fixture = path.join(ruleDir, file as string);
      fixtures.push(fixture);
    }
  }

  for (const fixture of fixtures) {
    const options = extractRuleOptions(ruleDir);
    const code = fs.readFileSync(fixture, { encoding: 'utf8' }).replaceAll(/\r?\n|\r/g, '\n');
    const { errors, output } = extractExpectations(
      code,
      fixture,
      sonarMeta.hasSecondaries ?? false,
    );

    const tests = {
      valid: [],
      invalid: [{ code, filename: fixture, errors, options, output }],
    };

    ruleTester.run(`Fixture ${fixture}`, ruleModule, tests);
  }
}

function extractRuleOptions(ruleDir) {
  const options = path.join(ruleDir, 'cb.options.json');
  if (fs.existsSync(options)) {
    return JSON.parse(fs.readFileSync(options, { encoding: 'utf8' }));
  }
  return [];
}
