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
import { Rule } from 'eslint';
import { NodeRuleTester } from '../rule-tester.js';
import path from 'path';
import { fileURLToPath } from 'node:url';

const parser = fileURLToPath(import.meta.resolve('@typescript-eslint/parser'));

const parserOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
  project: path.resolve(`${import.meta.dirname}/fixtures/tsconfig.json`),
};

const env = {
  es6: true,
};

const placeHolderFilePath = path.resolve(`${import.meta.dirname}/fixtures/placeholder.js`);

/**
 * Rule tester for JavaScript, using @typescript-eslint parser.
 */
class JavaScriptRuleTester extends NodeRuleTester {
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
      valid?: NodeRuleTester.ValidTestCase[];
      invalid?: NodeRuleTester.InvalidTestCase[];
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

export { JavaScriptRuleTester };
