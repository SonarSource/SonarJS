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
import { RuleTester, Rule } from 'eslint';
import path from 'path';

const parser = require.resolve('@typescript-eslint/parser');

const parserOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
  project: path.resolve(`${__dirname}/fixtures/tsconfig.json`),
};

const env = {
  es6: true,
};

const placeHolderFilePath = path.resolve(`${__dirname}/fixtures/placeholder.tsx`);

/**
 * Rule tester for Typescript, using @typescript-eslint parser, making sure that type information is present.
 * It will also assert that no issues is raised when there are no type information.
 */
class TypeScriptRuleTester extends RuleTester {
  constructor() {
    super({
      env,
      parser,
      parserOptions,
    });
  }

  run(
    name: string,
    rule: Rule.RuleModule,
    tests: {
      valid?: RuleTester.ValidTestCase[];
      invalid?: RuleTester.InvalidTestCase[];
    },
  ): void {
    const setFilename = test => {
      if (!test.filename) {
        test.filename = placeHolderFilePath;
      }
    };

    tests.valid.forEach(setFilename);
    tests.invalid.forEach(setFilename);

    super.run(name, rule, tests);
  }
}

export { TypeScriptRuleTester };
