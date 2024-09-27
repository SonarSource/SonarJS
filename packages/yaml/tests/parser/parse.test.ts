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
import { parseYaml } from '../../src/parser/index.js';
import { APIError, readFile } from '../../../shared/src/index.js';

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
