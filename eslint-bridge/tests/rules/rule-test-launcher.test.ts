/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import {readFileSync} from 'fs';
import * as path from 'path';
import {Rule, RuleTester, SourceCode} from 'eslint';

import {rules} from 'rules/main';
import {readAssertions} from '../testing-framework/assertions';
import {buildSourceCode} from 'parser';
import {FileType} from '../../src/analyzer';
import * as ts from "typescript";
import {ParserServices} from "@typescript-eslint/parser";

/**
 * Return test files for specific rule based on rule key
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

/**
 * This function is provided as 'parseForESLint' implementation which is used in RuleTester to invoke exactly same logic
 * as we use in our 'parser.ts' module
 */
export function parseForESLint(
  fileContent: string,
  options: { filePath: string },
  fileType: FileType = 'MAIN',
) {
  const { filePath } = options;
  const sourceCode = buildSourceCode(
    {
      filePath,
      fileContent,
      fileType,
      tsConfigs: [path.join(__dirname, 'fixtures/tsconfig.json')],
    },
    filePath.endsWith('.ts') ? 'ts' : 'js',
  );
  if (sourceCode instanceof SourceCode) {
    printDiag(sourceCode.parserServices);
    return {
      ast: sourceCode.ast,
      services: sourceCode.parserServices,
      scopeManager: sourceCode.scopeManager,
      visitorKeys: sourceCode.visitorKeys,
    };
  } else {
    throw new Error('failed to parse ' + sourceCode);
  }
}

function printDiag(services: ParserServices) {
  let allDiagnostics = ts
    .getPreEmitDiagnostics(services.program);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });

}

const ruleTester = new RuleTester({ parser: __filename });
runRuleTests(rules, ruleTester);
