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
import { rule } from './index.js';
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import { rules } from '../external/typescript-eslint/index.js';
import parser from '@babel/eslint-parser';
import { decorate } from './decorator.js';
import { Linter } from 'eslint';
import { dirname, join } from 'node:path/posix';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path/posix';
import { expect } from 'expect';
import { toUnixPath } from '../helpers/index.js';

const ruleTester = new RuleTester({
  parser,
  parserOptions: {
    requireConfigFile: false,
  },
});

// This test case is coming from closure library https://github.com/google/closure-library/blob/7818ff7dc0b53555a7fb3c3427e6761e88bde3a2/closure/goog/labs/net/webchannel/testing/fakewebchannel.js
const problemCode = ``;

describe('S6647', () => {
  it('S6647', () => {
    ruleTester.run(`Unnecessary constructors should be removed`, rule, {
      valid: [
        {
          code: problemCode,
        },
      ],
      invalid: [],
    });
  });
  it('should crash with decorated rule', async () => {
    // When this test fails to pass, we can remove our implementation and go back to decorated
    // 'no-useless-constructor' from 'typescript-eslint'
    // https://github.com/SonarSource/SonarJS/pull/4473
    const problemFile = join(
      dirname(toUnixPath(fileURLToPath(import.meta.url))),
      'fixtures',
      'problemCode.js',
    );
    const linter = new Linter();
    let failed = false;
    try {
      linter.verify(
        await readFile(problemFile, 'utf8'),
        {
          languageOptions: {
            parser,
            parserOptions: {
              requireConfigFile: false,
            },
          },
          files: [`**/${basename(problemFile)}`],
          plugins: {
            sonarjs: { rules: { S6647: decorate(rules['no-useless-constructor']) } },
          },
          rules: { [`sonarjs/S6647`]: 'error' },
        },
        { filename: problemFile, allowInlineConfig: false },
      );
    } catch (e) {
      expect(e.message).toContain("Cannot read properties of undefined (reading 'length')");
      failed = true;
    }
    expect(failed).toBeTruthy();
  });
});
