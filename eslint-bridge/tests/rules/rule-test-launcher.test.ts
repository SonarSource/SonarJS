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
import * as fs from 'fs';
import * as path from 'path';
import { Rule, RuleTester } from 'eslint';

import { rules } from 'rules/main';
import { readAssertions } from '../testing-framework/assertions';
import { readFileSync } from 'fs';

/**
 * Return test files for specific rule based on rule key
 * Looks for files like:
 * - fixtures/rule.ts
 * - fixtures/rule.js
 * - fixtures/rule/anything
 * @param rule - rule key
 */
function testFilesForRule(rule: string): string[] {
  const files = [];
  for (const ext of ['js', 'ts']) {
    const p = path.join(__dirname, 'fixtures', `${rule}.${ext}`);
    if (fs.existsSync(p)) {
      files.push(p);
    }
  }
  if (files.length !== 0) {
    return files;
  }
  const dir = path.join(__dirname, 'fixtures', `${rule}`);
  if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
    return fs.readdirSync(dir);
  }
  return [];
}

function runRuleTests(rules: Record<string, Rule.RuleModule>, ruleTester: RuleTester) {
  for (const rule in rules) {
    const files = testFilesForRule(rule);
    if (files.length === 0) {
      continue;
    }
    describe(`Running tests for rule ${rule}`, () => {
      files.forEach(filename => {
        const code = readFileSync(filename, { encoding: 'utf8' });
        const tests = {
          valid: [],
          invalid: [{ code, errors: readAssertions(code), filename }],
        };
        ruleTester.run(filename, rules[rule], tests);
      });
    });
  }
}

const pathToParser = path.join(__dirname, '../../tests/testing-framework/parseForEslint');

const ruleTester = new RuleTester({ parser: pathToParser });
runRuleTests(rules, ruleTester);
