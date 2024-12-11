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
import { RuleTester as ESLintRuleTester } from 'eslint';
import type { Linter, Rule } from 'eslint';
import path from 'path';
import parser from '@typescript-eslint/parser';
import globals from 'globals';
import merge from 'lodash.merge';

type Tests = {
  valid: (string | ESLintRuleTester.ValidTestCase)[];
  invalid: ESLintRuleTester.InvalidTestCase[];
};

const languageOptions: Linter.LanguageOptions = {
  parser,
  ecmaVersion: 2018,
  sourceType: 'module',
  globals: {
    ...globals.es2025,
  },
  parserOptions: {
    project: path.resolve(`${import.meta.dirname}/fixtures/tsconfig.json`),
    ecmaFeatures: {
      jsx: true,
    },
  },
} as const;

const placeHolderFilePath = path.resolve(`${import.meta.dirname}/fixtures/placeholder.tsx`);

/**
 * Rule tester for JavaScript, using @typescript-eslint parser.
 */
class RuleTester extends ESLintRuleTester {
  constructor(options?: Linter.LanguageOptions) {
    super({ languageOptions: merge({}, languageOptions, options) });
  }

  run(name: string, rule: Rule.RuleModule, tests: Tests): void {
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

export { RuleTester };
export type { Tests };
