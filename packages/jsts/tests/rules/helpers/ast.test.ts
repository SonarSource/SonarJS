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

import path from 'path';

import { Linter, Rule } from 'eslint';
import { getProperty } from '../../../src/rules/index.ts';

import { parseJavaScriptSourceFile } from '../../tools/index.ts';

describe('getProperty', () => {
  it.each([
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
  ])('it %s', async (_: string, fixtureFile: string, key: string, verifier: (property) => void) => {
    const baseDir = path.join(__dirname, 'fixtures');

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
