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
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { readFile } from '../../../shared/src/helpers/files.js';
import { parseYaml } from '../../src/parser/parse-yaml.js';
import { APIError } from '../../../shared/src/errors/error.js';

function noOpPicker(_key: any, _node: any, _ancestors: any) {
  return {};
}

describe('parseYaml', () => {
  it('should return embedded JavaScript', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'parse', 'embedded.yaml');
    const fileContent = await readFile(filePath);
    const parsingContexts = [
      {
        predicate: (_key: any, node: any, _ancestors: any) => node.key.value === 'embedded',
        picker: noOpPicker,
      },
    ];
    const [embedded] = parseYaml(parsingContexts, fileContent);
    expect(embedded).toEqual(
      expect.objectContaining({
        code: 'f(x)',
        line: 2,
        column: 13,
        offset: 17,
        lineStarts: [0, 5, 22, 27, 44],
        text: fileContent,
      }),
    );
  });

  it('should return parsing errors', async () => {
    const filePath = path.join(import.meta.dirname, 'fixtures', 'parse', 'error.yaml');
    const fileContent = await readFile(filePath);
    const parsingContexts = [
      {
        predicate: (_key: any, _node: any, _ancestors: any) => false,
        picker: noOpPicker,
      },
    ];
    expect(() => parseYaml(parsingContexts, fileContent)).toThrow(
      APIError.parsingError('Missing closing "quote', { line: 2 }),
    );
  });
});
