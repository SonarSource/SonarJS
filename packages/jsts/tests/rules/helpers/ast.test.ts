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
import path from 'path';

import { Linter, Rule } from 'eslint';
import { getProperty } from '../../../src/rules/index.js';

import { parseJavaScriptSourceFile } from '../../tools/index.js';
import { describe, test } from 'node:test';
import { expect } from 'expect';

describe('getProperty', () => {
  (
    [
      [
        'should read property of simple object',
        'normalObject.js',
        'foo',
        property => expect(property.value.type).toEqual('Literal'),
      ],
      [
        'should return null if key not found in simple object',
        'normalObject.js',
        'baz',
        property => expect(property).toBeNull(),
      ],
      [
        'should read property of object with a recursive spread operator',
        'objectWithSpread.js',
        'bar',
        property => expect(property.value.type).toEqual('Literal'),
      ],
      [
        'should read undefined of object with a recursive spread operator if key not found',
        'objectWithSpread.js',
        'baz',
        property => expect(property).toBeUndefined(),
      ],
    ] as [_: string, fixtureFile: string, key: string, verifier: (property) => void][]
  ).forEach(([_, fixtureFile, key, verifier]) => {
    test(`it ${_}`, async () => {
      const baseDir = path.join(import.meta.dirname, 'fixtures');

      const linter = new Linter();
      linter.defineRule('custom-rule-file', {
        create(context: Rule.RuleContext) {
          return {
            'ExpressionStatement ObjectExpression': node => {
              const property = getProperty(node, key, context);
              verifier(property);
            },
          };
        },
      } as Rule.RuleModule);

      const filePath = path.join(baseDir, fixtureFile);
      const sourceCode = await parseJavaScriptSourceFile(filePath);

      linter.verify(
        sourceCode,
        { rules: { 'custom-rule-file': 'error' } },
        { filename: filePath, allowInlineConfig: false },
      );
    });
  });
});
