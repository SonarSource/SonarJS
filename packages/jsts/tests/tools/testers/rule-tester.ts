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
import { dirname, join } from 'path';
import parser from '@typescript-eslint/parser';
import merge from 'lodash.merge';
import { fileURLToPath } from 'node:url';

type Tests = {
  valid: (string | ESLintRuleTester.ValidTestCase)[];
  invalid: ESLintRuleTester.InvalidTestCase[];
};

const baseLanguageOptions: Linter.LanguageOptions = {
  ecmaVersion: 2018,
  sourceType: 'module',
} as const;

const tsParserLanguageOptions: Linter.LanguageOptions = {
  parser,
};

const fixturesPath = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const typeCheckingLanguageOptions: Linter.LanguageOptions = {
  parserOptions: {
    project: join(fixturesPath, 'tsconfig.json'),
  },
} as const;

const placeHolderFilePath = join(fixturesPath, 'placeholder.tsx');
/**
 * Rule tester for JavaScript, using ESLint default parser (espree).
 */
class DefaultParserRuleTester extends ESLintRuleTester {
  constructor(options?: Linter.LanguageOptions) {
    super({
      files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      languageOptions: merge({}, baseLanguageOptions, options),
    });
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

/**
 * Rule tester for JS/TS, using @typescript-eslint parser.
 */
class NoTypeCheckingRuleTester extends DefaultParserRuleTester {
  constructor(options?: Linter.LanguageOptions) {
    super(merge({}, tsParserLanguageOptions, options));
  }
}

/**
 * Rule tester for JS/TS, using @typescript-eslint parser with type-checking.
 */
class RuleTester extends NoTypeCheckingRuleTester {
  constructor(options?: Linter.LanguageOptions) {
    super(merge({}, typeCheckingLanguageOptions, options));
  }
}

export { RuleTester, DefaultParserRuleTester, NoTypeCheckingRuleTester };
export type { Tests };
