/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { parseHTML } from 'parsing/embedded';
import { readFile } from 'helpers';

describe('parseYaml', () => {
  it('should return embedded JavaScript', async () => {
    const filePath = path.join(__dirname, '..', 'fixtures', 'simple.html');
    const fileContent = await readFile(filePath);
    const embeddedJss = parseHTML(fileContent);
    expect(embeddedJss).toBeDefined();

    console.log('got', JSON.stringify(embeddedJss, null, 2));

    for (const code of embeddedJss) {
      console.log('copmute', '"' + code + '"');
    }

    /* expect(embedded).toEqual(
      expect.objectContaining({
        code: 'f(x)',
        line: 2,
        column: 13,
        offset: 17,
        lineStarts: [0, 17, 25, 33, 55, 64, 73],
        text: fileContent,
      }),
    ); */
  });

  /* it('should return parsing errors', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'parse', 'error.yaml');
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
  }); */
});
