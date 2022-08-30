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

import path from 'path';
import { isAwsFunction, parseYaml, pickFunctionName, YamlVisitorPredicate } from 'parsing/yaml';
import { APIError } from 'errors';
import { readFileSync } from 'fs';

function voidPicker(_key: any, _node: any, _ancestors: any) {
  return {};
}

describe('parseYaml', () => {
  it('should return embedded JavaScript', () => {
    const filePath = path.join(__dirname, 'fixtures', 'parse', 'embedded.yaml');
    const text = readFileSync(filePath, { encoding: 'utf-8' });
    const predicate = (_key: any, node: any, _ancestors: any) => node.key.value === 'embedded';
    const [embedded] = parseYaml(predicate, voidPicker, filePath);
    expect(embedded).toEqual(
      expect.objectContaining({
        code: 'f(x)',
        line: 2,
        column: 13,
        offset: 17,
        lineStarts: [0, 5, 22, 27, 44],
        text,
      }),
    );
  });

  it('should extract the functionName when one exists', () => {
    const filePath = path.join(__dirname, 'fixtures', 'parse', 'functionNames.yaml');
    const [firstEmbedded, secondEmbedded] = parseYaml(isAwsFunction, pickFunctionName, filePath);
    expect(firstEmbedded).toEqual(
      expect.objectContaining({
        extras: expect.objectContaining({
          functionName: 'SomeLambdaFunction',
        }),
      }),
    );
    expect(secondEmbedded).toEqual(
      expect.objectContaining({
        extras: expect.objectContaining({
          functionName: 'OtherLambdaFunction',
        }),
      }),
    );
  });

  it('should return parsing errors', () => {
    const filePath = path.join(__dirname, 'fixtures', 'parse', 'error.yaml');
    const predicate = (() => false) as YamlVisitorPredicate;
    expect(() => parseYaml(predicate, voidPicker, filePath)).toThrow(
      APIError.parsingError('Missing closing "quote', { line: 2 }),
    );
  });
});
