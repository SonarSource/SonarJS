/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import fs from 'fs';
import path from 'path';
import { Rule } from 'eslint';
import { NodeRuleTester } from '../rule-tester.js';
import { hasSonarRuntimeOption } from '../../../../src/linter/parameters/sonar-runtime.js';
import { extractExpectations } from './framework.js';
import { join, dirname } from 'node:path';

/**
 * Checks that a rule raises the issues declared as comment-based expectations on fixture files.
 * These fixtures are to be found in the rule directory and should be named as `*.fixture.<ext>`.
 * The directory can include options (`cb.options.json`) to configure the rule behaviour.
 */
export function check(ruleId: string, ruleModule: Rule.RuleModule, ruleDir: string) {
  /**
   * Loading this file's `parseForESLint()` function into ESLint's rule tester.
   */
  const ruleTester = new NodeRuleTester({
    parser: join(dirname(import.meta.filename), 'parser.ts'),
  });

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

function extractRuleOptions(ruleDir) {
  const options = path.join(ruleDir, 'cb.options.json');
  if (fs.existsSync(options)) {
    return JSON.parse(fs.readFileSync(options, { encoding: 'utf8' }));
  }
  return [];
}
